"""
ARC-AI Mini Hub FastAPI service.

Responsibilities:
- Accept user queries, consult local cache, and escalate to main hub via network simulator.
- Manage encrypted packetization, queueing, retransmission with exponential backoff.
- Receive authoritative capsules, verify signatures, and reconcile fallback entries.
- Participate in manifest gossip for selective synchronization.
"""

from __future__ import annotations

import asyncio
import base64
import json
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, Optional, List

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import contextlib

from common.config import MiniHubSettings, RetransmitSettings, get_network_sim_settings, get_settings
from common.crypto import AESGCMEnvelope, decrypt_payload, encrypt_payload
from common.db import (
    fetch_capsule_by_hash,
    fetch_messages,
    initialize_mini_hub_db,
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
from common.chunker import chunk_payload
from mini_hub.cache import compute_question_hash, generate_fallback_answer, is_capsule_fresh
from mini_hub.crypto import verify_capsule_signature
from mini_hub.queue import delete_queue_item, enqueue_packet, iter_due_queue_items, update_queue_attempt
from network_sim.sim_client_lib import register_node, send_packet

configure_logging("mini-hub")
logger = get_logger("mini-hub")

app = FastAPI(title="ARC-AI Mini Hub Prototype")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    user_id: str
    question: str
    context: Optional[str] = None


class QueryResponse(BaseModel):
    answer: str
    capsule_id: str
    source: str
    confidence: float


class MessageSendRequest(BaseModel):
    sender_id: str
    recipient_id: Optional[str] = None
    content: str
    target_hub_id: Optional[str] = None


class MessageSendResponse(BaseModel):
    status: str
    message_id: str


@dataclass
class ServiceState:
    settings: MiniHubSettings
    retransmit: RetransmitSettings
    verify_key: str
    network_client: httpx.AsyncClient
    chunk_buffers: Dict[str, "ChunkBuffer"]
    chunk_lock: asyncio.Lock
    retransmit_task: Optional[asyncio.Task] = None
    manifest_task: Optional[asyncio.Task] = None


class ChunkBuffer:
    """Track partial packet chunks until whole payload is available."""

    def __init__(self, total_chunks: int):
        self.total = total_chunks
        self.chunks: Dict[int, bytes] = {}

    def add(self, index: int, data: bytes) -> Optional[bytes]:
        self.chunks[index] = data
        if len(self.chunks) == self.total:
            return b"".join(self.chunks[i] for i in sorted(self.chunks.keys()))
        return None


async def initialize_state() -> ServiceState:
    settings = get_settings().mini_hub
    retransmit = get_settings().retransmit
    await initialize_mini_hub_db(settings.sqlite_path)

    client = httpx.AsyncClient(timeout=httpx.Timeout(10.0, read=20.0))
    verify_key = await resolve_verify_key(settings, client)

    state = ServiceState(
        settings=settings,
        retransmit=retransmit,
        verify_key=verify_key,
        network_client=client,
        chunk_buffers={},
        chunk_lock=asyncio.Lock(),
    )

    await register_node(
        base_url=settings.network_sim_url,
        node_id=settings.node_id,
        callback_url=settings.callback_url,
        node_type="mini",
        client=client,
    )

    state.retransmit_task = asyncio.create_task(retransmit_loop(state))
    state.manifest_task = asyncio.create_task(manifest_poll_loop(state))
    logger.info("Mini hub %s initialized.", settings.node_id)
    return state


async def resolve_verify_key(settings: MiniHubSettings, client: httpx.AsyncClient) -> str:
    if settings.main_hub_verify_key:
        return settings.main_hub_verify_key
    response = await client.get(f"{settings.main_hub_url}/keys/public")
    response.raise_for_status()
    data = response.json()
    verify_key = data.get("verify_key")
    if not verify_key:
        raise RuntimeError("Main hub did not return verify key")
    return verify_key


async def shutdown_state(state: ServiceState) -> None:
    for task in (state.retransmit_task, state.manifest_task):
        if task:
            task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await task
    await state.network_client.aclose()
    logger.info("Mini hub shutdown complete.")


async def retransmit_loop(state: ServiceState) -> None:
    """Background worker to process queued packets with exponential backoff."""

    while True:
        try:
            await asyncio.sleep(1.0)
            async with open_db(state.settings.sqlite_path) as conn:
                async for item in iter_due_queue_items(conn):
                    await attempt_delivery(state, conn, item)
                await conn.commit()
        except Exception as exc:  # pragma: no cover - diagnostic logging
            logger.exception("Retransmit loop error: %s", exc)


async def attempt_delivery(state: ServiceState, conn, queue_item) -> None:
    payload = queue_item.payload
    packet_dict = payload["packet"]
    dst_id = payload["dst_id"]
    queue_id = str(queue_item.id)

    try:
        response = await send_packet(
            base_url=state.settings.network_sim_url,
            src_id=state.settings.node_id,
            dst_id=dst_id,
            packet_json=packet_dict,
            client=state.network_client,
        )
    except httpx.HTTPError as exc:
        logger.warning("Retransmit transport error: %s", exc)
        await handle_retry(state, conn, queue_item, queue_id)
        return

    if response.get("status") != "ACK":
        logger.warning("Retransmit received NAK | pkt=%s", packet_dict["pkt_id"])
        await handle_retry(state, conn, queue_item, queue_id)
        return

    downstream = response.get("downstream_response")
    if downstream:
        ack = HubAck.model_validate(downstream)
        if ack.response_packet:
            response_packet = Packet.model_validate(ack.response_packet)
            if response_packet.total_chunks > 1:
                raise RuntimeError("Chunked responses are not supported in retransmit path")
            response_bytes = base64.b64decode(response_packet.payload_enc.encode("utf-8"))
            await handle_complete_packet(state, response_packet, response_bytes)

    await delete_queue_item(conn, queue_id)


async def handle_retry(state: ServiceState, conn, queue_item, queue_id: str) -> None:
    attempt = queue_item.attempt + 1
    settings = state.retransmit
    if attempt > settings.max_retries:
        logger.error("Max retries reached for pkt=%s chunk=%s", queue_item.pkt_id, queue_item.chunk_index)
        await delete_queue_item(conn, queue_id)
        return
    await update_queue_attempt(
        conn,
        queue_id,
        attempt,
        settings.base_backoff_seconds,
        settings.backoff_multiplier,
    )


async def manifest_poll_loop(state: ServiceState) -> None:
    interval = get_settings().capsule.gossip_interval_seconds
    while True:
        await asyncio.sleep(interval)
        try:
            response = await state.network_client.get(f"{state.settings.main_hub_url}/manifests/latest")
            response.raise_for_status()
            manifest = Manifest.model_validate(response.json())
            await sync_manifest(state, manifest)
        except Exception as exc:  # pragma: no cover - background logging
            logger.exception("Manifest poller error: %s", exc)


async def buffer_chunk(state: ServiceState, packet: Packet) -> Optional[bytes]:
    chunk_bytes = base64.b64decode(packet.payload_enc.encode("utf-8"))
    if packet.total_chunks <= 1:
        return chunk_bytes

    async with state.chunk_lock:
        buffer = state.chunk_buffers.get(packet.pkt_id)
        if buffer is None:
            buffer = ChunkBuffer(packet.total_chunks)
            state.chunk_buffers[packet.pkt_id] = buffer
        assembled = buffer.add(packet.chunk_index, chunk_bytes)
        if assembled is not None:
            state.chunk_buffers.pop(packet.pkt_id, None)
        return assembled


async def store_capsule(state: ServiceState, capsule: KnowledgeCapsule, ingest_source: str) -> None:
    async with open_db(state.settings.sqlite_path) as conn:
        await insert_capsule(conn, capsule.model_dump(), ingest_source=ingest_source)
        await conn.commit()


async def store_user_message(
    state: ServiceState,
    message: UserMessage,
    direction: str,
) -> None:
    record = message.model_dump()
    record["direction"] = direction
    async with open_db(state.settings.sqlite_path) as conn:
        await insert_message(conn, record)
        await conn.commit()


async def reconcile_fallback(state: ServiceState, question_hash: str) -> None:
    async with open_db(state.settings.sqlite_path) as conn:
        await conn.execute(
            "DELETE FROM capsules WHERE question_hash = ? AND ingest_source = 'fallback'",
            (question_hash,),
        )
        await conn.commit()


async def sync_manifest(state: ServiceState, manifest: Manifest) -> None:
    async with open_db(state.settings.sqlite_path) as conn:
        await upsert_metadata(conn, "latest_manifest", manifest.model_dump_json())
        await conn.commit()

    async with open_db(state.settings.sqlite_path) as conn:
        async with conn.execute("SELECT capsule_id FROM capsules") as cursor:
            local_ids = {row["capsule_id"] for row in await cursor.fetchall()}

    missing_ids = [cap_id for cap_id in manifest.capsule_ids if cap_id not in local_ids]
    if not missing_ids:
        logger.info("Manifest sync: no missing capsules.")
        return

    for capsule_id in missing_ids:
        try:
            response = await state.network_client.get(f"{state.settings.main_hub_url}/capsules/{capsule_id}")
            response.raise_for_status()
            capsule_dict = response.json()
            if not verify_capsule_signature(capsule_dict, state.verify_key):
                logger.error("Manifest sync signature invalid for capsule %s", capsule_id)
                continue
            capsule_dict["timestamp"] = datetime.fromisoformat(capsule_dict["timestamp"])
            capsule = KnowledgeCapsule(**capsule_dict)
            await store_capsule(state, capsule, ingest_source="manifest")
        except httpx.HTTPError as exc:
            logger.error("Failed to fetch capsule %s: %s", capsule_id, exc)


async def handle_complete_packet(
    state: ServiceState, packet: Packet, payload_bytes: bytes
) -> Optional[AuthoritativePayload]:
    plaintext = decrypt_payload(AESGCMEnvelope.from_bytes(payload_bytes))
    payload_dict = json.loads(plaintext)
    payload_type = payload_dict.get("type")

    if payload_type == "authoritative_response":
        payload = AuthoritativePayload.model_validate(payload_dict)
        capsule_dict = payload.capsule.model_dump(mode="json")

        if not verify_capsule_signature(capsule_dict, state.verify_key):
            logger.error("Signature verification failed for capsule %s", payload.capsule.capsule_id)
            raise HTTPException(status_code=400, detail="Signature verification failed")

        await reconcile_fallback(state, payload.capsule.question_hash)
        await store_capsule(state, payload.capsule, ingest_source="authoritative")
        logger.info("Stored authoritative capsule %s", payload.capsule.capsule_id)
        return payload

    if payload_type == "manifest":
        manifest = ManifestPayload.model_validate(payload_dict)
        await sync_manifest(state, manifest.manifest)
        logger.info("Manifest payload processed from %s", packet.src_id)
        return None

    if payload_type == "user_message":
        payload = MessagePayload.model_validate(payload_dict)
        await store_user_message(state, payload.message, direction="incoming")
        logger.info(
            "Received message %s from hub %s", payload.message.message_id, payload.message.source_hub_id
        )
        return None

    raise HTTPException(status_code=400, detail=f"Unsupported payload type: {payload_type}")


async def dispatch_query_to_main(
    state: ServiceState, query_payload: QueryPayload, question_hash: str
) -> Optional[AuthoritativePayload]:
    plaintext = query_payload.model_dump_json().encode("utf-8")
    envelope = encrypt_payload(plaintext)
    payload_bytes = envelope.to_bytes()

    network_cfg = get_network_sim_settings()
    chunks = chunk_payload(payload_bytes, network_cfg.max_chunk_size_bytes)
    total_chunks = len(chunks)

    packets = []
    for idx, chunk in enumerate(chunks):
        packet = Packet(
            pkt_id=uuid.uuid4().hex,
            src_id=state.settings.node_id,
            dst_id=state.settings.main_hub_node_id,
            timestamp=datetime.now(timezone.utc),
            payload_enc=base64.b64encode(chunk).decode("utf-8"),
            meta=PacketMeta(q_hash=question_hash, priority=1),
            chunk_index=idx,
            total_chunks=total_chunks,
        )
        packets.append(packet)

    for packet in packets:
        try:
            response = await send_packet(
                base_url=state.settings.network_sim_url,
                src_id=state.settings.node_id,
                dst_id=packet.dst_id,
                packet_json=packet.model_dump(mode="json"),
                client=state.network_client,
            )
        except httpx.HTTPError as exc:
            logger.warning("Query send failed, queueing for retry: %s", exc)
            await queue_packet_for_retry(state, packet)
            raise

        if response.get("status") != "ACK":
            logger.warning("Network simulator NAK for pkt=%s", packet.pkt_id)
            await queue_packet_for_retry(state, packet)
            raise RuntimeError("Network simulator returned NAK")

        downstream = response.get("downstream_response")
        if downstream:
            ack = HubAck.model_validate(downstream)
            if ack.response_packet:
                response_packet = Packet.model_validate(ack.response_packet)
                if response_packet.total_chunks > 1:
                    raise RuntimeError("Chunked responses are not supported in synchronous path")
                response_bytes = base64.b64decode(response_packet.payload_enc.encode("utf-8"))
                return await handle_complete_packet(state, response_packet, response_bytes)

    return None


async def dispatch_message_to_main(state: ServiceState, message: UserMessage) -> None:
    await store_user_message(state, message, direction="outgoing")

    payload = MessagePayload(message=message)
    plaintext = payload.model_dump_json().encode("utf-8")
    envelope = encrypt_payload(plaintext)
    payload_bytes = envelope.to_bytes()

    network_cfg = get_network_sim_settings()
    chunks = chunk_payload(payload_bytes, network_cfg.max_chunk_size_bytes)
    total_chunks = len(chunks)

    packets: List[Packet] = []
    for idx, chunk in enumerate(chunks):
        packet = Packet(
            pkt_id=uuid.uuid4().hex,
            src_id=state.settings.node_id,
            dst_id=state.settings.main_hub_node_id,
            timestamp=datetime.now(timezone.utc),
            payload_enc=base64.b64encode(chunk).decode("utf-8"),
            meta=PacketMeta(priority=1),
            chunk_index=idx,
            total_chunks=total_chunks,
        )
        packets.append(packet)

    for packet in packets:
        try:
            response = await send_packet(
                base_url=state.settings.network_sim_url,
                src_id=state.settings.node_id,
                dst_id=packet.dst_id,
                packet_json=packet.model_dump(mode="json"),
                client=state.network_client,
            )
        except httpx.HTTPError as exc:
            logger.warning("Message send failed, queueing for retry: %s", exc)
            await queue_packet_for_retry(state, packet)
            raise

        if response.get("status") != "ACK":
            logger.warning("Network simulator NAK for message pkt=%s", packet.pkt_id)
            await queue_packet_for_retry(state, packet)
            raise RuntimeError("Network simulator returned NAK")


async def queue_packet_for_retry(state: ServiceState, packet: Packet) -> None:
    async with open_db(state.settings.sqlite_path) as conn:
        await enqueue_packet(
            conn,
            pkt_id=packet.pkt_id,
            chunk_index=packet.chunk_index,
            payload={
                "packet": packet.model_dump(mode="json"),
                "dst_id": packet.dst_id,
            },
            base_backoff=state.retransmit.base_backoff_seconds,
        )
        await conn.commit()


async def handle_fallback(state: ServiceState, query: QueryRequest, question_hash: str) -> QueryResponse:
    answer, confidence = generate_fallback_answer(query.question)
    capsule = KnowledgeCapsule(
        capsule_id=f"fallback-{uuid.uuid4().hex}",
        question_hash=question_hash,
        question_text=query.question,
        answer_text=answer,
        compressed_embedding=None,
        source_id=state.settings.node_id,
        timestamp=datetime.now(timezone.utc),
        signature="fallback",
    )
    await store_capsule(state, capsule, ingest_source="fallback")
    return QueryResponse(
        answer=answer,
        capsule_id=capsule.capsule_id,
        source="Fallback",
        confidence=confidence,
    )


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


@app.post("/messages/send", response_model=MessageSendResponse)
async def send_message(request: MessageSendRequest) -> MessageSendResponse:
    state: ServiceState = app.state.service
    message = UserMessage(
        message_id=uuid.uuid4().hex,
        sender_id=request.sender_id,
        recipient_id=request.recipient_id,
        content=request.content,
        timestamp=datetime.now(timezone.utc),
        source_hub_id=state.settings.node_id,
        target_hub_id=request.target_hub_id,
    )

    try:
        await dispatch_message_to_main(state, message)
        status = "sent"
    except Exception as exc:
        logger.warning("Dispatch to main hub failed, message queued for retry: %s", exc)
        status = "queued"

    return MessageSendResponse(status=status, message_id=message.message_id)


@app.get("/messages/inbox")
async def list_inbox_messages(user_id: Optional[str] = None, limit: int = 50) -> Dict[str, list]:
    state: ServiceState = app.state.service
    async with open_db(state.settings.sqlite_path) as conn:
        records = await fetch_messages(conn, direction="incoming", user_id=user_id, limit=limit)
    return {"messages": records}


@app.get("/messages/sent")
async def list_sent_messages(user_id: Optional[str] = None, limit: int = 50) -> Dict[str, list]:
    state: ServiceState = app.state.service
    async with open_db(state.settings.sqlite_path) as conn:
        records = await fetch_messages(conn, direction="outgoing", user_id=user_id, limit=limit)
    return {"messages": records}


@app.post("/query", response_model=QueryResponse)
async def handle_query(query: QueryRequest) -> QueryResponse:
    state: ServiceState = app.state.service
    question_hash = compute_question_hash(query.question)
    async with open_db(state.settings.sqlite_path) as conn:
        record = await fetch_capsule_by_hash(conn, question_hash)

    if record and record.get("ingest_source") != "fallback" and is_capsule_fresh(record, get_settings().capsule.capsule_ttl_days):
        logger.info("Cache hit for question hash %s", question_hash)
        return QueryResponse(
            answer=record["answer_text"],
            capsule_id=record["capsule_id"],
            source="LocalCache",
            confidence=0.88,
        )

    query_payload = QueryPayload(user_id=query.user_id, question=query.question, context=query.context)

    try:
        authoritative = await dispatch_query_to_main(state, query_payload, question_hash)
    except Exception:
        logger.info("Falling back for question hash %s", question_hash)
        return await handle_fallback(state, query, question_hash)

    if authoritative:
        capsule = authoritative.capsule
        return QueryResponse(
            answer=capsule.answer_text,
            capsule_id=capsule.capsule_id,
            source="Authoritative",
            confidence=authoritative.confidence,
        )

    # If we reached this point without payload, treat as fallback
    return await handle_fallback(state, query, question_hash)


@app.post("/recv_packet")
async def recv_packet(packet: Packet) -> HubAck:
    state: ServiceState = app.state.service
    payload_bytes = await buffer_chunk(state, packet)
    if payload_bytes is None:
        return HubAck(status="ACK", message="Chunk buffered", needs_more_chunks=True)
    try:
        payload = await handle_complete_packet(state, packet, payload_bytes)
    except HTTPException as exc:
        return HubAck(status="NAK", message=str(exc.detail))

    if payload and isinstance(payload, AuthoritativePayload):
        return HubAck(status="ACK", message="Capsule ingested")

    return HubAck(status="ACK", message="Payload processed")


@app.get("/capsules/list")
async def list_capsules() -> Dict[str, list]:
    state: ServiceState = app.state.service
    async with open_db(state.settings.sqlite_path) as conn:
        async with conn.execute(
            "SELECT capsule_id, question_hash, ingest_source, timestamp FROM capsules ORDER BY timestamp DESC"
        ) as cursor:
            rows = await cursor.fetchall()
            capsules = [
                {
                    "capsule_id": row["capsule_id"],
                    "question_hash": row["question_hash"],
                    "ingest_source": row["ingest_source"],
                    "timestamp": row["timestamp"],
                }
                for row in rows
            ]
    return {"capsules": capsules}



