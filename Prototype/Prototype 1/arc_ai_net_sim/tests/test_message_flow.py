import uuid
from datetime import datetime, timezone

import httpx
import pytest
from httpx import ASGITransport

from common.config import get_settings
from common.crypto import encrypt_payload
from common.models import MessagePayload, Packet, PacketMeta, UserMessage
from main_hub.app import app as main_app
from mini_hub.app import app as mini_app


@pytest.mark.asyncio
async def test_main_hub_user_message_processing(tmp_path, monkeypatch):
    get_settings.cache_clear()
    monkeypatch.setenv("MAIN_HUB_SQLITE_PATH", str(tmp_path / "main.db"))
    monkeypatch.setenv("MAIN_HUB_CALLBACK_URL", "http://main-hub/process_packet")
    monkeypatch.setenv("MAIN_HUB_NETWORK_SIM_URL", "http://sim-placeholder")
    monkeypatch.setenv("MAIN_HUB_KNOWN_MINI_HUBS", '["mh-alpha"]')

    captured_packets: list[dict] = []

    async def fake_register_node(*args, **kwargs):
        return {"status": "registered"}

    async def fake_send_packet(*args, **kwargs):
        captured_packets.append({"args": args, "kwargs": kwargs})
        return {"status": "ACK"}

    monkeypatch.setattr("network_sim.sim_client_lib.register_node", fake_register_node)
    monkeypatch.setattr("network_sim.sim_client_lib.send_packet", fake_send_packet)
    monkeypatch.setattr("main_hub.app.register_node", fake_register_node)
    monkeypatch.setattr("main_hub.app.send_packet", fake_send_packet)

    await main_app.router.startup()
    try:
        async with httpx.AsyncClient(
            transport=ASGITransport(app=main_app), base_url="http://main-hub"
        ) as client:
            message = UserMessage(
                message_id=uuid.uuid4().hex,
                sender_id="u1",
                recipient_id="u2",
                content="hello from alpha",
                timestamp=datetime.now(timezone.utc),
                source_hub_id="mh-source",
                target_hub_id="mh-alpha",
            )
            payload = MessagePayload(message=message)
            envelope = encrypt_payload(payload.model_dump_json().encode("utf-8"))

            packet = Packet(
                pkt_id=uuid.uuid4().hex,
                src_id="mh-source",
                dst_id="main-hub",
                timestamp=datetime.now(timezone.utc),
                payload_enc=envelope.to_base64(),
                meta=PacketMeta(priority=1),
                chunk_index=0,
                total_chunks=1,
            )

            response = await client.post("/process_packet", json=packet.model_dump(mode="json"))
            assert response.status_code == 200
            assert response.json()["status"] == "ACK"

            assert captured_packets, "Expected broadcast to known mini hubs"
            broadcast = captured_packets[0]["kwargs"]["packet_json"]
            assert broadcast["dst_id"] == "mh-alpha"

            all_messages = (await client.get("/messages")).json()["messages"]
            assert any(record["direction"] == "outgoing" for record in all_messages), "Expected outgoing message recorded"
    finally:
        await main_app.router.shutdown()

    get_settings.cache_clear()


@pytest.mark.asyncio
async def test_mini_hub_send_and_receive_messages(tmp_path, monkeypatch):
    get_settings.cache_clear()
    monkeypatch.setenv("MINI_HUB_SQLITE_PATH", str(tmp_path / "mini.db"))
    monkeypatch.setenv("MINI_HUB_NODE_ID", "mh-alpha")
    monkeypatch.setenv("MINI_HUB_NETWORK_SIM_URL", "http://sim-placeholder")
    monkeypatch.setenv("MINI_HUB_CALLBACK_URL", "http://mh-alpha/recv_packet")
    monkeypatch.setenv("MINI_HUB_MAIN_HUB_URL", "http://main-hub")

    captured_packets: list[dict] = []

    async def fake_register_node(*args, **kwargs):
        return {"status": "registered"}

    async def fake_send_packet(*args, **kwargs):
        captured_packets.append({"args": args, "kwargs": kwargs})
        return {"status": "ACK"}

    monkeypatch.setattr("network_sim.sim_client_lib.register_node", fake_register_node)
    monkeypatch.setattr("network_sim.sim_client_lib.send_packet", fake_send_packet)
    monkeypatch.setattr("mini_hub.app.register_node", fake_register_node)
    monkeypatch.setattr("mini_hub.app.send_packet", fake_send_packet)

    async def fake_resolve_verify_key(*args, **kwargs):
        return "test-verify-key"

    monkeypatch.setattr("mini_hub.app.resolve_verify_key", fake_resolve_verify_key)

    await mini_app.router.startup()
    try:
        async with httpx.AsyncClient(
            transport=ASGITransport(app=mini_app), base_url="http://mh-alpha"
        ) as client:
            payload = {
                "sender_id": "alpha-user",
                "recipient_id": "beta-user",
                "content": "test ping",
                "target_hub_id": "mh-beta",
            }
            send_response = await client.post("/messages/send", json=payload)
            assert send_response.status_code == 200
            body = send_response.json()
            assert body["status"] in {"sent", "queued"}
            assert captured_packets, "Expected packet dispatch to network simulator"

            incoming_message = UserMessage(
                message_id=uuid.uuid4().hex,
                sender_id="beta-user",
                recipient_id="alpha-user",
                content="return message",
                timestamp=datetime.now(timezone.utc),
                source_hub_id="mh-beta",
                target_hub_id="mh-alpha",
            )
            envelope = encrypt_payload(MessagePayload(message=incoming_message).model_dump_json().encode("utf-8"))
            packet = Packet(
                pkt_id=uuid.uuid4().hex,
                src_id="mh-beta",
                dst_id="mh-alpha",
                timestamp=datetime.now(timezone.utc),
                payload_enc=envelope.to_base64(),
                meta=PacketMeta(priority=1),
                chunk_index=0,
                total_chunks=1,
            )

            recv = await client.post("/recv_packet", json=packet.model_dump(mode="json"))
            assert recv.status_code == 200
            assert recv.json()["status"] == "ACK"

            inbox = await client.get("/messages/inbox", params={"user_id": "alpha-user"})
            assert any(msg["content"] == "return message" for msg in inbox.json()["messages"])

            sent = await client.get("/messages/sent", params={"user_id": "alpha-user"})
            assert any(msg["content"] == "test ping" for msg in sent.json()["messages"])
    finally:
        await mini_app.router.shutdown()

    get_settings.cache_clear()
