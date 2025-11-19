import asyncio
import base64
import json
import uuid
from datetime import datetime, timezone

import httpx
import pytest
from fastapi import FastAPI
from httpx import ASGITransport

from common.config import get_network_sim_settings
from common.crypto import encrypt_payload
from common.models import Packet, PacketMeta
from network_sim.sim_server import app as network_app


@pytest.fixture(autouse=True)
def reset_network_sim_state():
    # Reset registry and runtime settings before each test
    async def _reset():
        async with network_app.state.registry_lock:
            network_app.state.registry.clear()
        async with network_app.state.settings_lock:
            network_app.state.settings = get_network_sim_settings()
    asyncio.get_event_loop().run_until_complete(_reset())
    yield
    network_app.state.http_client = None


@pytest.mark.asyncio
async def test_network_sim_auto_chunk_and_reassembly():
    dest_app = FastAPI()
    chunk_storage = {}
    complete_event = asyncio.Event()

    @dest_app.post("/recv")
    async def recv(packet: dict):
        chunk_storage[packet["chunk_index"]] = packet["payload_enc"]
        if len(chunk_storage) == packet["total_chunks"]:
            complete_event.set()
        return {"status": "ACK"}

    async with httpx.AsyncClient(transport=ASGITransport(app=network_app), base_url="http://sim") as sim_client, \
            httpx.AsyncClient(transport=ASGITransport(app=dest_app), base_url="http://dest") as dest_client:

        network_app.state.http_client = dest_client
        async with network_app.state.settings_lock:
            network_app.state.settings = get_network_sim_settings(override={"packet_loss_pct": 0.0})
        assert network_app.state.settings.packet_loss_pct == 0.0

        await sim_client.post(
            "/register",
            json={"node_id": "dest", "callback_url": "http://dest/recv", "node_type": "utility"},
        )

        plaintext = b"A" * 4096
        envelope = encrypt_payload(plaintext)
        packet = Packet(
            pkt_id=uuid.uuid4().hex,
            src_id="tester",
            dst_id="dest",
            timestamp=datetime.now(timezone.utc),
            payload_enc=envelope.to_base64(),
            meta=PacketMeta(priority=1),
            chunk_index=0,
            total_chunks=1,
        )

        response = await sim_client.post(
            "/send",
            json={"src_id": "tester", "dst_id": "dest", "packet": packet.model_dump(mode="json")},
        )
        response.raise_for_status()
        result = response.json()

        await asyncio.wait_for(complete_event.wait(), timeout=2.0)

        assembled_bytes = b"".join(
            base64.b64decode(chunk_storage[idx].encode("utf-8"))
            for idx in sorted(chunk_storage.keys())
        )
        assert assembled_bytes == envelope.to_bytes()
        assert result["status"] == "ACK"
        assert result["total_chunks"] == len(chunk_storage)
        assert result["delivered_chunks"] == len(chunk_storage)


@pytest.mark.asyncio
async def test_network_sim_packet_loss_results_in_nak():
    async with network_app.state.settings_lock:
        network_app.state.settings = get_network_sim_settings(override={"packet_loss_pct": 100.0})

    async with httpx.AsyncClient(transport=ASGITransport(app=network_app), base_url="http://sim") as sim_client:
        await sim_client.post(
            "/register",
            json={"node_id": "dest", "callback_url": "http://example.com/recv", "node_type": "utility"},
        )

        packet = Packet(
            pkt_id=uuid.uuid4().hex,
            src_id="tester",
            dst_id="dest",
            timestamp=datetime.now(timezone.utc),
            payload_enc=encrypt_payload(b"hello").to_base64(),
            meta=PacketMeta(priority=1),
            chunk_index=0,
            total_chunks=1,
        )

        response = await sim_client.post(
            "/send",
            json={"src_id": "tester", "dst_id": "dest", "packet": packet.model_dump(mode="json")},
        )
        result = response.json()
        assert result["status"] == "NAK"

