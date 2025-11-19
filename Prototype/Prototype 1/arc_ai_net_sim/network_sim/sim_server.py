"""
Network simulator service for ARC-AI transport prototype.

Simulates latency, packet loss, bandwidth throttling, and optional reordering
between mini hubs and the main hub. Handles ACK/NAK semantics and provides
node registration so the transport can discover delivery endpoints.
"""

from __future__ import annotations

import asyncio
import base64
import random
import time
from typing import Any, Dict, List

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import AnyHttpUrl, BaseModel, Field

from common.chunker import chunk_payload
from common.config import NetworkSimSettings, get_network_sim_settings
from common.logging import configure_logging, get_logger
from common.models import Packet

configure_logging("network-sim")
logger = get_logger("network-sim")


class NodeRegistration(BaseModel):
    """Represents a node that can receive packets via the simulator."""

    node_id: str
    callback_url: AnyHttpUrl
    node_type: str = Field(..., pattern="^(main|mini|utility)$")


class SendRequest(BaseModel):
    """Incoming transport request."""

    src_id: str
    dst_id: str
    packet: Packet


class SendResponse(BaseModel):
    status: str = Field(..., pattern="^(ACK|NAK)$")
    pkt_id: str
    chunk_index: int
    total_chunks: int
    delivered_chunks: int
    latency_ms: float
    message: str | None = None
    downstream_response: Dict[str, Any] | None = None
    chunk_results: List[Dict[str, Any]] | None = None


app = FastAPI(title="ARC-AI Network Simulator")
app.state.registry: Dict[str, NodeRegistration] = {}
app.state.registry_lock = asyncio.Lock()
app.state.http_client: httpx.AsyncClient | None = None
app.state.settings: NetworkSimSettings = get_network_sim_settings()
app.state.settings_lock = asyncio.Lock()


@app.on_event("startup")
async def startup_event() -> None:
    app.state.http_client = httpx.AsyncClient(timeout=httpx.Timeout(10.0, read=20.0))
    logger.info("Network simulator started with settings: %s", app.state.settings.dict())


@app.on_event("shutdown")
async def shutdown_event() -> None:
    if app.state.http_client:
        await app.state.http_client.aclose()
    logger.info("Network simulator shutdown complete.")


@app.get("/healthz")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/register")
async def register_node(registration: NodeRegistration) -> dict[str, str]:
    """Register a node with its callback URL so the simulator can deliver packets."""

    async with app.state.registry_lock:
        app.state.registry[registration.node_id] = registration
        logger.info("Registered node %s at %s", registration.node_id, registration.callback_url)
    return {"status": "registered", "node_id": registration.node_id}


@app.post("/unregister")
async def unregister_node(node: NodeRegistration) -> dict[str, str]:
    async with app.state.registry_lock:
        removed = app.state.registry.pop(node.node_id, None)
    if removed:
        logger.info("Unregistered node %s", node.node_id)
    return {"status": "unregistered", "node_id": node.node_id}


async def _simulate_delay(payload_length_bytes: int) -> float:
    """Apply latency and bandwidth throttling, returning total delay in seconds."""

    settings: NetworkSimSettings = app.state.settings
    base_delay = settings.latency_ms / 1000.0
    transfer_delay = payload_length_bytes / settings.bandwidth_bytes_per_sec
    reorder_delay = 0.0
    if settings.enable_reordering:
        reorder_delay = random.uniform(0, base_delay if base_delay else 0.05)
    total_delay = base_delay + transfer_delay + reorder_delay
    if total_delay > 0:
        await asyncio.sleep(total_delay)
    return total_delay


async def _deliver_packet(
    client: httpx.AsyncClient, registration: NodeRegistration, packet: Packet
) -> Dict[str, Any]:
    """Send packet to destination callback."""

    url = str(registration.callback_url)
    response = await client.post(url, json=packet.model_dump(mode="json"))
    response.raise_for_status()
    if response.content:
        return response.json()
    return {"status": "ACK"}


@app.post("/send", response_model=SendResponse)
async def send_packet(request: SendRequest) -> SendResponse:
    """
    Simulate sending a packet between nodes.

    Applies latency/bandwidth throttling and packet loss. Returns ACK/NAK metadata.
    """

    settings: NetworkSimSettings = app.state.settings
    packet = request.packet

    # Check registration
    async with app.state.registry_lock:
        registration = app.state.registry.get(request.dst_id)

    if not registration:
        logger.error("Destination %s not registered", request.dst_id)
        raise HTTPException(status_code=404, detail="Destination not registered")

    # Prepare packet list (auto-chunk if necessary)
    try:
        payload_bytes = base64.b64decode(packet.payload_enc.encode("utf-8"))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid base64 payload: {exc}") from exc

    packets_to_send: List[Packet]
    if settings.auto_chunk_large_payloads and len(payload_bytes) > settings.max_chunk_size_bytes and packet.total_chunks <= 1:
        chunks = chunk_payload(payload_bytes, settings.max_chunk_size_bytes)
        packets_to_send = []
        for idx, chunk in enumerate(chunks):
            chunk_packet = packet.model_copy(deep=True)
            chunk_packet.chunk_index = idx
            chunk_packet.total_chunks = len(chunks)
            chunk_packet.payload_enc = base64.b64encode(chunk).decode("utf-8")
            packets_to_send.append(chunk_packet)
        logger.info(
            "Auto-chunked packet | pkt=%s total_chunks=%s max_size=%s",
            packet.pkt_id,
            len(packets_to_send),
            settings.max_chunk_size_bytes,
        )
    else:
        packets_to_send = [packet]
        if len(payload_bytes) > settings.max_chunk_size_bytes and packet.total_chunks <= 1:
            logger.warning(
                "Oversized packet without chunking | pkt=%s size=%s max=%s",
                packet.pkt_id,
                len(payload_bytes),
                settings.max_chunk_size_bytes,
            )

    temp_client: httpx.AsyncClient | None = None
    if app.state.http_client is None:
        temp_client = httpx.AsyncClient(timeout=httpx.Timeout(10.0, read=20.0))
        client = temp_client
    else:
        client = app.state.http_client

    chunk_results: List[Dict[str, Any]] = []
    delivered_chunks = 0
    total_latency_ms = 0.0

    try:
        for chunk_packet in packets_to_send:
            loss_roll = random.uniform(0, 100)
            if loss_roll < settings.packet_loss_pct:
                logger.warning(
                    "Packet chunk dropped | pkt=%s chunk=%s loss_roll=%.2f pct=%.2f",
                    chunk_packet.pkt_id,
                    chunk_packet.chunk_index,
                    loss_roll,
                    settings.packet_loss_pct,
                )
                return SendResponse(
                    status="NAK",
                    pkt_id=chunk_packet.pkt_id,
                    chunk_index=chunk_packet.chunk_index,
                    total_chunks=len(packets_to_send),
                    delivered_chunks=delivered_chunks,
                    latency_ms=total_latency_ms,
                    message="Packet chunk dropped by simulator",
                    chunk_results=chunk_results or None,
                )

            chunk_payload_bytes = base64.b64decode(chunk_packet.payload_enc.encode("utf-8"))
            start = time.perf_counter()
            await _simulate_delay(len(chunk_payload_bytes))

            try:
                downstream = await _deliver_packet(client, registration, chunk_packet)
            except httpx.HTTPStatusError as exc:
                logger.error(
                    "Destination error | pkt=%s chunk=%s status=%s",
                    chunk_packet.pkt_id,
                    chunk_packet.chunk_index,
                    exc.response.status_code,
                )
                return SendResponse(
                    status="NAK",
                    pkt_id=chunk_packet.pkt_id,
                    chunk_index=chunk_packet.chunk_index,
                    total_chunks=len(packets_to_send),
                    delivered_chunks=delivered_chunks,
                    latency_ms=total_latency_ms,
                    message=f"Destination error: {exc.response.text}",
                    chunk_results=chunk_results or None,
                )
            except httpx.RequestError as exc:
                logger.error(
                    "Delivery failure | pkt=%s chunk=%s err=%s",
                    chunk_packet.pkt_id,
                    chunk_packet.chunk_index,
                    exc,
                )
                return SendResponse(
                    status="NAK",
                    pkt_id=chunk_packet.pkt_id,
                    chunk_index=chunk_packet.chunk_index,
                    total_chunks=len(packets_to_send),
                    delivered_chunks=delivered_chunks,
                    latency_ms=total_latency_ms,
                    message=str(exc),
                    chunk_results=chunk_results or None,
                )

            chunk_latency_ms = (time.perf_counter() - start) * 1000
            delivered_chunks += 1
            total_latency_ms += chunk_latency_ms
            chunk_results.append(
                {
                    "chunk_index": chunk_packet.chunk_index,
                    "latency_ms": chunk_latency_ms,
                    "downstream": downstream,
                }
            )
            logger.info(
                "Chunk delivered | pkt=%s chunk=%s latency_ms=%.2f dest=%s",
                chunk_packet.pkt_id,
                chunk_packet.chunk_index,
                chunk_latency_ms,
                registration.node_id,
            )

        return SendResponse(
            status="ACK",
            pkt_id=packet.pkt_id,
            chunk_index=packets_to_send[-1].chunk_index,
            total_chunks=len(packets_to_send),
            delivered_chunks=delivered_chunks,
            latency_ms=total_latency_ms,
            downstream_response=chunk_results[-1]["downstream"] if chunk_results else None,
            chunk_results=chunk_results or None,
        )
    finally:
        if temp_client is not None:
            await temp_client.aclose()


def main() -> None:
    import uvicorn

    uvicorn.run("network_sim.sim_server:app", host="0.0.0.0", port=9000, reload=False)


class SettingsUpdate(BaseModel):
    latency_ms: int | None = None
    packet_loss_pct: float | None = None
    max_chunk_size_bytes: int | None = None
    bandwidth_bytes_per_sec: int | None = None
    enable_reordering: bool | None = None
    auto_chunk_large_payloads: bool | None = None


@app.get("/admin/config")
async def get_config() -> Dict[str, Any]:
    async with app.state.settings_lock:
        return app.state.settings.dict()


@app.post("/admin/config")
async def update_config(update: SettingsUpdate) -> Dict[str, Any]:
    async with app.state.settings_lock:
        current = app.state.settings.dict()
        for field, value in update.dict(exclude_none=True).items():
            current[field] = value
        app.state.settings = NetworkSimSettings(**current)
        logger.info("Updated simulator settings: %s", current)
        return app.state.settings.dict()


if __name__ == "__main__":
    main()


