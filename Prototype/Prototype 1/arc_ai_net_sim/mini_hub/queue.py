"""
Queue persistence helpers for Mini Hub retransmit logic.

Provides helpers to enqueue packets, update attempts with exponential backoff,
and delete items once delivery succeeds.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import AsyncIterator, Dict, Optional
from uuid import uuid4

import aiosqlite

from common.models import QueueItem


async def enqueue_packet(
    conn: aiosqlite.Connection,
    pkt_id: str,
    chunk_index: int,
    payload: Dict,
    base_backoff: float,
) -> str:
    queue_id = uuid4().hex
    next_retry = datetime.now(timezone.utc) + timedelta(seconds=base_backoff)
    await conn.execute(
        """
        INSERT INTO send_queue(id, pkt_id, chunk_index, attempt, next_retry, payload)
        VALUES(?, ?, ?, ?, ?, ?)
        """,
        (queue_id, pkt_id, chunk_index, 1, next_retry.isoformat(), json.dumps(payload)),
    )
    return queue_id


async def update_queue_attempt(
    conn: aiosqlite.Connection,
    queue_id: str,
    attempt: int,
    base_backoff: float,
    multiplier: float,
) -> None:
    next_retry = datetime.now(timezone.utc) + timedelta(seconds=base_backoff * (multiplier ** (attempt - 1)))
    await conn.execute(
        "UPDATE send_queue SET attempt = ?, next_retry = ? WHERE id = ?",
        (attempt, next_retry.isoformat(), queue_id),
    )


async def delete_queue_item(conn: aiosqlite.Connection, queue_id: str) -> None:
    await conn.execute("DELETE FROM send_queue WHERE id = ?", (queue_id,))


async def iter_due_queue_items(conn: aiosqlite.Connection) -> AsyncIterator[QueueItem]:
    now = datetime.now(timezone.utc)
    async with conn.execute(
        "SELECT id, pkt_id, chunk_index, attempt, next_retry, payload FROM send_queue"
    ) as cursor:
        async for row in cursor:
            retry_time = datetime.fromisoformat(row["next_retry"])
            if retry_time <= now:
                yield QueueItem(
                    id=row["id"],
                    pkt_id=row["pkt_id"],
                    chunk_index=row["chunk_index"],
                    attempt=row["attempt"],
                    next_retry=retry_time,
                    payload=json.loads(row["payload"]),
                )


