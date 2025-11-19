import asyncio
import json
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path

import httpx
import pytest
from fastapi import FastAPI
from httpx import ASGITransport

from common.config import MiniHubSettings, RetransmitSettings
from common.crypto import generate_signing_keypair, sign_capsule
from common.db import initialize_mini_hub_db, open_db
from common.models import KnowledgeCapsule, Manifest
from mini_hub.app import ServiceState, sync_manifest
from mini_hub.crypto import verify_capsule_signature


def test_signature_verification_round_trip():
    signing_key, verify_key = generate_signing_keypair()
    capsule = {
        "capsule_id": "caps-001",
        "question_hash": "hash-001",
        "question_text": "What is machine learning?",
        "answer_text": "Machine learning lets systems learn patterns from data.",
        "compressed_embedding": None,
        "source_id": "main-hub",
        "timestamp": "2024-01-01T00:00:00Z",
    }
    serialized = json.dumps(capsule, sort_keys=True).encode("utf-8")
    capsule["signature"] = sign_capsule(serialized, signing_key)
    assert verify_capsule_signature(capsule, verify_key) is True

    capsule["answer_text"] = "Tampered answer."
    assert verify_capsule_signature(capsule, verify_key) is False


@pytest.mark.asyncio
async def test_manifest_sync_fetches_missing_capsules(tmp_path: Path):
    signing_key, verify_key = generate_signing_keypair()
    timestamp = datetime.now(timezone.utc)
    capsule = KnowledgeCapsule(
        capsule_id="caps-123",
        question_hash="hash-123",
        question_text="Define photosynthesis.",
        answer_text="Photosynthesis converts light to chemical energy.",
        compressed_embedding=None,
        source_id="main-hub",
        timestamp=timestamp,
        signature="",
    )

    payload = json.dumps(capsule.model_dump(exclude={"signature"}, mode="json"), sort_keys=True).encode("utf-8")
    capsule.signature = sign_capsule(payload, signing_key)

    digest_source = f"{capsule.capsule_id}::{capsule.answer_text}::{capsule.signature}"
    manifest = Manifest(
        node_id="main-hub",
        capsule_ids=[capsule.capsule_id],
        digests={capsule.capsule_id: sha256(digest_source.encode("utf-8")).hexdigest()},
        timestamp=datetime.now(timezone.utc),
    )

    main_app = FastAPI()

    @main_app.get("/capsules/{capsule_id}")
    async def get_capsule(capsule_id: str):
        assert capsule_id == capsule.capsule_id
        return capsule.model_dump(mode="json")

    sqlite_path = tmp_path / "mini.db"
    await initialize_mini_hub_db(str(sqlite_path))

    transport = ASGITransport(app=main_app)
    network_client = httpx.AsyncClient(transport=transport, base_url="http://main")

    settings = MiniHubSettings(
        node_id="mh-test",
        main_hub_url="http://main",
        network_sim_url="http://sim",
        sqlite_path=str(sqlite_path),
        callback_url="http://localhost/recv_packet",
        main_hub_node_id="main-hub",
    )
    retransmit = RetransmitSettings()

    state = ServiceState(
        settings=settings,
        retransmit=retransmit,
        verify_key=verify_key,
        network_client=network_client,
        chunk_buffers={},
        chunk_lock=asyncio.Lock(),
    )

    await sync_manifest(state, manifest)

    async with open_db(str(sqlite_path)) as conn:
        async with conn.execute(
            "SELECT capsule_id, ingest_source FROM capsules WHERE capsule_id = ?",
            (capsule.capsule_id,),
        ) as cursor:
            row = await cursor.fetchone()
            assert row is not None
            assert row["ingest_source"] in ("manifest", "authoritative")

    await network_client.aclose()

