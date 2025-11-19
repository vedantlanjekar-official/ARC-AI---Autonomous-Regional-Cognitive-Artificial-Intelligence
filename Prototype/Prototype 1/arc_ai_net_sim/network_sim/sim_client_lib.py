"""
Async client utilities for interacting with the ARC-AI network simulator.

Provides registration helpers and the `send_packet` coroutine used by mini hubs
and the main hub to exchange encrypted packets via the simulated transport.
"""

from __future__ import annotations

from typing import Any, Dict, Optional

import httpx

DEFAULT_TIMEOUT = httpx.Timeout(connect=5.0, read=30.0, write=5.0, pool=5.0)


async def register_node(
    base_url: str, node_id: str, callback_url: str, node_type: str, client: Optional[httpx.AsyncClient] = None
) -> Dict[str, Any]:
    payload = {"node_id": node_id, "callback_url": callback_url, "node_type": node_type}
    if client:
        response = await client.post(f"{base_url}/register", json=payload)
    else:
        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as session:
            response = await session.post(f"{base_url}/register", json=payload)
    response.raise_for_status()
    return response.json()


async def unregister_node(
    base_url: str, node_id: str, callback_url: str, node_type: str, client: Optional[httpx.AsyncClient] = None
) -> Dict[str, Any]:
    payload = {"node_id": node_id, "callback_url": callback_url, "node_type": node_type}
    if client:
        response = await client.post(f"{base_url}/unregister", json=payload)
    else:
        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as session:
            response = await session.post(f"{base_url}/unregister", json=payload)
    response.raise_for_status()
    return response.json()


async def send_packet(
    base_url: str,
    src_id: str,
    dst_id: str,
    packet_json: Dict[str, Any],
    client: Optional[httpx.AsyncClient] = None,
) -> Dict[str, Any]:
    """
    Invoke the network simulator to deliver a packet from src to dst.

    Returns the simulator's ACK/NAK envelope containing latency metrics and any downstream response.
    """

    payload = {"src_id": src_id, "dst_id": dst_id, "packet": packet_json}

    if client:
        response = await client.post(f"{base_url}/send", json=payload)
    else:
        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as session:
            response = await session.post(f"{base_url}/send", json=payload)

    response.raise_for_status()
    return response.json()



