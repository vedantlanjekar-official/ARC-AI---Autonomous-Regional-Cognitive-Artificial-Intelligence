"""
ARC-AI Main Hub FastAPI service.

Responsibilities:
- Receive encrypted, chunked packets from mini hubs via the network simulator.
- Reassemble and decrypt payloads, generate deterministic authoritative answers.
- Sign knowledge capsules, persist them to SQLite, and emit manifests.
- Broadcast manifests through the network simulator for gossip synchronization.
"""

from __future__ import annotations

import asyncio
import base64
import json
import os
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
import contextlib
from typing import Dict, Optional, List, Iterable

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from common.config import MainHubSettings, get_settings
from common.crypto import (
    AESGCMEnvelope,
    decrypt_payload,
    encrypt_payload,
    generate_signing_keypair,
    sign_capsule,
)
from common.db import (
    fetch_capsule,
    fetch_metadata,
    fetch_messages,
    initialize_main_hub_db,
    insert_capsule,
    insert_message,
    open_db,
    upsert_metadata,
)
from common.logging import configure_logging, get_logger
from common.models import (
    AuthoritativePayload,
    HubAck,
    KnowledgeCapsule,
    Manifest,
    ManifestPayload,
    MessagePayload,
    Packet,
    PacketMeta,
    QueryPayload,
    UserMessage,
)
from network_sim.sim_client_lib import register_node, send_packet

configure_logging("main-hub")
logger = get_logger("main-hub")

app = FastAPI(title="ARC-AI Main Hub Prototype")


@dataclass
class ServiceState:
    settings: MainHubSettings
    signing_key_b64: str
    verify_key_b64: str
    network_client: httpx.AsyncClient
    chunk_buffers: Dict[str, "ChunkBuffer"]
    chunk_lock: asyncio.Lock
    manifest_task: Optional[asyncio.Task] = None


class ChunkBuffer:
    """Track partial chunks until complete payload reassembly."""

    def __init__(self, total_chunks: int):
        self.total_chunks = total_chunks
        self.chunks: Dict[int, bytes] = {}

    def add_chunk(self, index: int, data: bytes) -> Optional[bytes]:
        self.chunks[index] = data
        if len(self.chunks) == self.total_chunks:
            assembled = b"".join(self.chunks[i] for i in sorted(self.chunks.keys()))
            return assembled
        return None


def load_signing_keys() -> tuple[str, str]:
    """Load Ed25519 signing keys from env or disk. Generates new pair if missing."""

    env_sign = os.getenv("MAIN_HUB_SIGNING_KEY_B64")
    env_verify = os.getenv("MAIN_HUB_VERIFY_KEY_B64")
    if env_sign and env_verify:
        return env_sign, env_verify

    key_dir = Path("keys")
    sign_path = key_dir / "main_hub_signing.key"
    verify_path = key_dir / "main_hub_verify.key"

    if sign_path.exists() and verify_path.exists():
        return sign_path.read_text().strip(), verify_path.read_text().strip()

    key_dir.mkdir(parents=True, exist_ok=True)
    signing_key, verify_key = generate_signing_keypair()
    sign_path.write_text(signing_key)
    verify_path.write_text(verify_key)
    logger.warning("Generated ephemeral signing keys for main hub (for dev use only).")
    return signing_key, verify_key


async def initialize_state() -> ServiceState:
    settings = get_settings().main_hub
    await initialize_main_hub_db(settings.sqlite_path)
    signing_key, verify_key = load_signing_keys()
    client = httpx.AsyncClient(timeout=httpx.Timeout(10.0, read=20.0))

    state = ServiceState(
        settings=settings,
        signing_key_b64=signing_key,
        verify_key_b64=verify_key,
        network_client=client,
        chunk_buffers={},
        chunk_lock=asyncio.Lock(),
    )

    await register_node(
        base_url=settings.network_sim_url,
        node_id=settings.node_id,
        callback_url=settings.callback_url,
        node_type="main",
        client=client,
    )

    state.manifest_task = asyncio.create_task(manifest_broadcast_loop(state))
    logger.info("Main hub initialized.")
    return state


async def shutdown_state(state: ServiceState) -> None:
    if state.manifest_task:
        state.manifest_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await state.manifest_task
    await state.network_client.aclose()
    logger.info("Main hub shutdown complete.")


async def manifest_broadcast_loop(state: ServiceState) -> None:
    """Periodic manifest gossip broadcast."""

    interval = get_settings().capsule.manifest_interval_seconds
    while True:
        await asyncio.sleep(interval)
        try:
            manifest = await get_latest_manifest(state)
            await broadcast_manifest(state, manifest)
        except Exception as exc:  # pragma: no cover - logging path
            logger.exception("Manifest broadcast error: %s", exc)


async def broadcast_manifest(state: ServiceState, manifest: Manifest) -> None:
    payload = ManifestPayload(manifest=manifest)
    plaintext = payload.model_dump_json().encode("utf-8")
    envelope = encrypt_payload(plaintext)

    for mini_id in state.settings.known_mini_hubs:
        packet = Packet(
            pkt_id=uuid.uuid4().hex,
            src_id=state.settings.node_id,
            dst_id=mini_id,
            timestamp=datetime.now(timezone.utc),
            payload_enc=envelope.to_base64(),
            meta=PacketMeta(priority=1),
            chunk_index=0,
            total_chunks=1,
        )
        try:
            response = await send_packet(
                base_url=state.settings.network_sim_url,
                src_id=state.settings.node_id,
                dst_id=mini_id,
                packet_json=packet.model_dump(mode="json"),
                client=state.network_client,
            )
            logger.info(
                "Manifest broadcast | mini=%s pkt=%s status=%s",
                mini_id,
                packet.pkt_id,
                response.get("status"),
            )
        except httpx.HTTPError as exc:
            logger.error("Failed to broadcast manifest to %s: %s", mini_id, exc)


async def buffer_chunk(state: ServiceState, packet: Packet) -> Optional[bytes]:
    chunk_bytes = base64.b64decode(packet.payload_enc.encode("utf-8"))
    if packet.total_chunks <= 1:
        return chunk_bytes

    async with state.chunk_lock:
        buffer = state.chunk_buffers.get(packet.pkt_id)
        if buffer is None:
            buffer = ChunkBuffer(total_chunks=packet.total_chunks)
            state.chunk_buffers[packet.pkt_id] = buffer
        assembled = buffer.add_chunk(packet.chunk_index, chunk_bytes)
        if assembled is not None:
            state.chunk_buffers.pop(packet.pkt_id, None)
        return assembled


async def store_capsule(state: ServiceState, capsule: KnowledgeCapsule) -> None:
    async with open_db(state.settings.sqlite_path) as conn:
        await insert_capsule(conn, capsule.model_dump(), ingest_source="authoritative")
        manifest = await build_manifest_from_conn(state, conn)
        await upsert_metadata(conn, "latest_manifest", manifest.model_dump_json())
        await conn.commit()


async def store_message(state: ServiceState, message: UserMessage, direction: str, target_hub_id: Optional[str]) -> None:
    record = message.model_dump()
    record["direction"] = direction
    record["target_hub_id"] = target_hub_id or record.get("target_hub_id")
    async with open_db(state.settings.sqlite_path) as conn:
        await insert_message(conn, record)
        await conn.commit()


async def build_manifest_from_conn(state: ServiceState, conn) -> Manifest:
    async with conn.execute("SELECT capsule_id, answer_text, signature FROM capsules ORDER BY timestamp DESC") as cursor:
        rows = await cursor.fetchall()

    capsule_ids = [row["capsule_id"] for row in rows]
    digests: Dict[str, str] = {}
    for row in rows:
        digest_source = f"{row['capsule_id']}::{row['answer_text']}::{row['signature']}"
        digests[row["capsule_id"]] = sha256(digest_source.encode("utf-8")).hexdigest()

    return Manifest(
        node_id=state.settings.node_id,
        capsule_ids=capsule_ids,
        digests=digests,
        timestamp=datetime.now(timezone.utc),
    )


async def get_latest_manifest(state: ServiceState) -> Manifest:
    async with open_db(state.settings.sqlite_path) as conn:
        stored = await fetch_manifest_from_metadata(conn)
        if stored:
            return stored
        manifest = await build_manifest_from_conn(state, conn)
        await upsert_metadata(conn, "latest_manifest", manifest.model_dump_json())
        await conn.commit()
        return manifest


async def fetch_manifest_from_metadata(conn) -> Optional[Manifest]:
    stored = await fetch_metadata(conn, "latest_manifest")
    if not stored:
        return None
    data = json.loads(stored)
    data["timestamp"] = datetime.fromisoformat(data["timestamp"])
    return Manifest(**data)


def deterministic_answer(question: str) -> tuple[str, float]:
    digest = sha256(question.encode("utf-8")).hexdigest()[:8]
    answer = f"[ARC-AI authoritative:{digest}] {question[::-1]}"
    confidence = 0.92
    return answer, confidence


def build_capsule(state: ServiceState, query: QueryPayload, answer_text: str) -> KnowledgeCapsule:
    capsule_id = uuid.uuid4().hex
    question_hash = sha256(query.question.encode("utf-8")).hexdigest()
    timestamp = datetime.now(timezone.utc)
    capsule = KnowledgeCapsule(
        capsule_id=capsule_id,
        question_hash=question_hash,
        question_text=query.question,
        answer_text=answer_text,
        compressed_embedding=None,
        source_id=state.settings.node_id,
        timestamp=timestamp,
        signature="",
    )

    serialized = json.dumps(capsule.model_dump(exclude={"signature"}), sort_keys=True).encode("utf-8")
    signature = sign_capsule(serialized, state.signing_key_b64)
    capsule.signature = signature
    return capsule


async def process_query_packet(state: ServiceState, packet: Packet, payload: QueryPayload) -> HubAck:
    answer_text, confidence = deterministic_answer(payload.question)
    capsule = build_capsule(state, payload, answer_text=answer_text)
    await store_capsule(state, capsule)

    response_payload = AuthoritativePayload(capsule=capsule, confidence=confidence)
    response_envelope = encrypt_payload(response_payload.model_dump_json().encode("utf-8"))

    response_packet = Packet(
        pkt_id=uuid.uuid4().hex,
        src_id=state.settings.node_id,
        dst_id=packet.src_id,
        timestamp=datetime.now(timezone.utc),
        payload_enc=response_envelope.to_base64(),
        meta=PacketMeta(q_hash=capsule.question_hash, priority=packet.meta.priority),
        chunk_index=0,
        total_chunks=1,
    )

    logger.info("Processed query capsule=%s question_hash=%s", capsule.capsule_id, capsule.question_hash)

    return HubAck(status="ACK", message="Authoritative response ready", response_packet=response_packet)


async def broadcast_user_message(state: ServiceState, message: UserMessage, exclude: Iterable[str]) -> None:
    excluded = set(exclude)
    targets: List[str]
    if message.target_hub_id:
        targets = [message.target_hub_id]
    else:
        targets = list(state.settings.known_mini_hubs)

    for mini_id in targets:
        if mini_id in excluded:
            continue
        outbound_message = message.model_copy(update={"target_hub_id": mini_id})
        payload = MessagePayload(message=outbound_message)
        envelope = encrypt_payload(payload.model_dump_json().encode("utf-8"))
        packet = Packet(
            pkt_id=uuid.uuid4().hex,
            src_id=state.settings.node_id,
            dst_id=mini_id,
            timestamp=datetime.now(timezone.utc),
            payload_enc=envelope.to_base64(),
            meta=PacketMeta(priority=1),
            chunk_index=0,
            total_chunks=1,
        )
        try:
            await send_packet(
                base_url=state.settings.network_sim_url,
                src_id=state.settings.node_id,
                dst_id=mini_id,
                packet_json=packet.model_dump(mode="json"),
                client=state.network_client,
            )
            await store_message(state, outbound_message, direction="outgoing", target_hub_id=mini_id)
            logger.info("Forwarded message %s to mini hub %s", message.message_id, mini_id)
        except httpx.HTTPError as exc:
            logger.error("Failed to forward message %s to %s: %s", message.message_id, mini_id, exc)


async def process_user_message_packet(state: ServiceState, packet: Packet, payload: MessagePayload) -> HubAck:
    message = payload.message
    if not message.source_hub_id:
        message = message.model_copy(update={"source_hub_id": packet.src_id})

    await store_message(state, message, direction="incoming", target_hub_id=message.target_hub_id)

    await broadcast_user_message(state, message, exclude={packet.src_id})

    return HubAck(status="ACK", message="Message relayed")


def parse_envelope_payload(payload_bytes: bytes) -> bytes:
    envelope = AESGCMEnvelope.from_bytes(payload_bytes)
    decrypted = decrypt_payload(envelope)
    return decrypted


@app.on_event("startup")
async def on_startup() -> None:
    app.state.service = await initialize_state()


@app.on_event("shutdown")
async def on_shutdown() -> None:
    state: ServiceState = app.state.service
    with contextlib.suppress(Exception):
        await shutdown_state(state)


@app.get("/healthz")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/process_packet")
async def process_packet(packet: Packet) -> HubAck:
    state: ServiceState = app.state.service

    payload_bytes = await buffer_chunk(state, packet)
    if payload_bytes is None:
        logger.debug("Chunk received | pkt=%s chunk=%s waiting", packet.pkt_id, packet.chunk_index)
        return HubAck(status="ACK", message="Chunk buffered", needs_more_chunks=True)

    plaintext = parse_envelope_payload(payload_bytes)

    try:
        payload_dict = json.loads(plaintext)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid JSON payload: {exc}") from exc

    payload_type = payload_dict.get("type")

    if payload_type == "query":
        try:
            query_payload = QueryPayload.model_validate(payload_dict)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Invalid query payload: {exc}") from exc
        return await process_query_packet(state, packet, query_payload)

    if payload_type == "user_message":
        try:
            message_payload = MessagePayload.model_validate(payload_dict)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Invalid message payload: {exc}") from exc
        return await process_user_message_packet(state, packet, message_payload)

    raise HTTPException(status_code=400, detail=f"Unsupported payload type: {payload_type}")


@app.get("/manifests/latest")
async def manifests_latest() -> Manifest:
    state: ServiceState = app.state.service
    manifest = await get_latest_manifest(state)
    return manifest


@app.get("/capsules/{capsule_id}")
async def get_capsule(capsule_id: str) -> KnowledgeCapsule:
    state: ServiceState = app.state.service
    async with open_db(state.settings.sqlite_path) as conn:
        record = await fetch_capsule(conn, capsule_id)
    if not record:
        raise HTTPException(status_code=404, detail="Capsule not found")
    record["timestamp"] = datetime.fromisoformat(record["timestamp"])
    return KnowledgeCapsule(**record)


@app.get("/messages")
async def list_messages(
    direction: Optional[str] = None,
    user_id: Optional[str] = None,
    limit: int = 50,
) -> Dict[str, list]:
    state: ServiceState = app.state.service
    async with open_db(state.settings.sqlite_path) as conn:
        records = await fetch_messages(conn, direction=direction, user_id=user_id, limit=limit)
    return {"messages": records}


@app.get("/keys/public")
async def public_key() -> dict[str, str]:
    state: ServiceState = app.state.service
    return {"verify_key": state.verify_key_b64}


class SeedEntry(BaseModel):
    question_text: str
    answer_text: str


@app.post("/admin/seed")
async def seed_capsules(entries: List[SeedEntry]) -> dict[str, int]:
    state: ServiceState = app.state.service
    total = 0
    for entry in entries:
        query = QueryPayload(user_id="seed", question=entry.question_text, context=None)
        capsule = build_capsule(state, query, answer_text=entry.answer_text)
        await store_capsule(state, capsule)
        total += 1
    return {"seeded": total}



