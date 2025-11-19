"""
SQLite helper utilities shared across services.

Provides async context managers and initialization helpers for consistent schema setup.
"""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator, Iterable, Tuple

import aiosqlite

SCHEMA_VERSION = 2


CREATE_METADATA_TABLE = """
CREATE TABLE IF NOT EXISTS metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"""


CREATE_CAPSULES_TABLE = """
CREATE TABLE IF NOT EXISTS capsules (
    capsule_id TEXT PRIMARY KEY,
    question_hash TEXT,
    question_text TEXT,
    answer_text TEXT,
    compressed_embedding TEXT,
    source_id TEXT,
    timestamp TEXT,
    signature TEXT,
    ingest_source TEXT
);
"""


CREATE_MESSAGES_TABLE = """
CREATE TABLE IF NOT EXISTS messages (
    message_id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    recipient_id TEXT,
    source_hub_id TEXT,
    target_hub_id TEXT,
    content TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    direction TEXT NOT NULL
);
"""


CREATE_QUEUE_TABLE = """
CREATE TABLE IF NOT EXISTS send_queue (
    id TEXT PRIMARY KEY,
    pkt_id TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    attempt INTEGER NOT NULL,
    next_retry TEXT NOT NULL,
    payload TEXT NOT NULL
);
"""


CREATE_MANIFEST_TABLE = """
CREATE TABLE IF NOT EXISTS manifests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    manifest TEXT NOT NULL,
    timestamp TEXT NOT NULL
);
"""


@asynccontextmanager
async def open_db(path: str) -> AsyncIterator[aiosqlite.Connection]:
    """Async context manager for SQLite connections with WAL enabled."""

    Path(path).parent.mkdir(parents=True, exist_ok=True)
    conn = await aiosqlite.connect(path)
    conn.row_factory = aiosqlite.Row
    try:
        await conn.execute("PRAGMA journal_mode=WAL;")
        await conn.execute("PRAGMA synchronous=NORMAL;")
        await conn.execute("PRAGMA foreign_keys=ON;")
        yield conn
    finally:
        await conn.close()


async def initialize_main_hub_db(path: str) -> None:
    """Initialize schema for main hub."""

    async with open_db(path) as conn:
        await conn.executescript(
            CREATE_METADATA_TABLE
            + CREATE_CAPSULES_TABLE
            + CREATE_MESSAGES_TABLE
            + CREATE_MANIFEST_TABLE
        )
        await conn.commit()


async def initialize_mini_hub_db(path: str) -> None:
    """Initialize schema for mini hub."""

    async with open_db(path) as conn:
        await conn.executescript(
            CREATE_METADATA_TABLE
            + CREATE_CAPSULES_TABLE
            + CREATE_MESSAGES_TABLE
            + CREATE_QUEUE_TABLE
            + CREATE_MANIFEST_TABLE
        )
        await conn.commit()


async def upsert_metadata(conn: aiosqlite.Connection, key: str, value: str) -> None:
    await conn.execute(
        "INSERT INTO metadata(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        (key, value),
    )


async def fetch_metadata(conn: aiosqlite.Connection, key: str) -> str | None:
    async with conn.execute("SELECT value FROM metadata WHERE key = ?", (key,)) as cursor:
        row = await cursor.fetchone()
        return row[0] if row else None


async def insert_capsule(conn: aiosqlite.Connection, capsule: dict, ingest_source: str) -> None:
    timestamp = capsule["timestamp"]
    if hasattr(timestamp, "isoformat"):
        timestamp = timestamp.isoformat()
    await conn.execute(
        """
        INSERT OR REPLACE INTO capsules(
            capsule_id, question_hash, question_text, answer_text,
            compressed_embedding, source_id, timestamp, signature, ingest_source
        ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            capsule["capsule_id"],
            capsule["question_hash"],
            capsule["question_text"],
            capsule["answer_text"],
            capsule.get("compressed_embedding"),
            capsule["source_id"],
            timestamp,
            capsule["signature"],
            ingest_source,
        ),
    )


async def insert_message(
    conn: aiosqlite.Connection,
    message: dict,
) -> None:
    timestamp = message["timestamp"]
    if hasattr(timestamp, "isoformat"):
        timestamp = timestamp.isoformat()
    await conn.execute(
        """
        INSERT OR REPLACE INTO messages(
            message_id, sender_id, recipient_id, source_hub_id,
            target_hub_id, content, timestamp, direction
        ) VALUES(?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            message["message_id"],
            message["sender_id"],
            message.get("recipient_id"),
            message.get("source_hub_id"),
            message.get("target_hub_id"),
            message["content"],
            timestamp,
            message["direction"],
        ),
    )


async def fetch_messages(
    conn: aiosqlite.Connection,
    *,
    direction: str | None = None,
    user_id: str | None = None,
    limit: int = 50,
) -> list[dict]:
    query = "SELECT * FROM messages"
    clauses = []
    params: list = []

    if direction:
        clauses.append("direction = ?")
        params.append(direction)
    if user_id:
        clauses.append("(sender_id = ? OR recipient_id = ?)")
        params.extend([user_id, user_id])

    if clauses:
        query += " WHERE " + " AND ".join(clauses)

    query += " ORDER BY datetime(timestamp) DESC LIMIT ?"
    params.append(limit)

    async with conn.execute(query, params) as cursor:
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


async def fetch_capsule_ids(conn: aiosqlite.Connection) -> Iterable[str]:
    async with conn.execute("SELECT capsule_id FROM capsules ORDER BY timestamp DESC") as cursor:
        rows = await cursor.fetchall()
        return [row[0] for row in rows]


async def fetch_capsule(conn: aiosqlite.Connection, capsule_id: str) -> dict | None:
    async with conn.execute("SELECT * FROM capsules WHERE capsule_id = ?", (capsule_id,)) as cursor:
        row = await cursor.fetchone()
        if not row:
            return None
        columns = [desc[0] for desc in cursor.description]
        return dict(zip(columns, row))


async def fetch_capsule_by_hash(conn: aiosqlite.Connection, question_hash: str) -> dict | None:
    async with conn.execute(
        "SELECT * FROM capsules WHERE question_hash = ? ORDER BY timestamp DESC LIMIT 1",
        (question_hash,),
    ) as cursor:
        row = await cursor.fetchone()
        if not row:
            return None
        return dict(row)


async def iterate_queue(conn: aiosqlite.Connection) -> AsyncIterator[Tuple[str, str, int, int, str, str]]:
    async with conn.execute("SELECT id, pkt_id, chunk_index, attempt, next_retry, payload FROM send_queue") as cursor:
        async for row in cursor:
            yield row


def init_sync(func, *args, **kwargs):
    """Convenience helper to run async initializers in sync contexts."""

    return asyncio.get_event_loop().run_until_complete(func(*args, **kwargs))


