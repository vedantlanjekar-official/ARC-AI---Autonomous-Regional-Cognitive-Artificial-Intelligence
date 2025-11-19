"""
Packet chunking and reassembly utilities for ARC-AI transport prototype.

These helpers ensure large payloads are fragmented per simulator bandwidth
constraints and reassembled reliably on receipt.
"""

from __future__ import annotations

import math
from typing import Dict, Iterable, List, Tuple


def chunk_payload(payload: bytes, max_chunk_size: int) -> List[bytes]:
    """Split payload into chunks honoring max size."""

    if max_chunk_size <= 0:
        raise ValueError("max_chunk_size must be positive")

    if len(payload) <= max_chunk_size:
        return [payload]

    total_chunks = math.ceil(len(payload) / max_chunk_size)
    return [payload[i * max_chunk_size : (i + 1) * max_chunk_size] for i in range(total_chunks)]


def reassemble_chunks(chunks: Iterable[Tuple[int, bytes]], expected_total: int, max_chunk_size: int) -> bytes:
    """
    Reconstruct original payload from chunk stream.

    Raises ValueError if chunks are missing or exceed constraints.
    """

    if expected_total <= 0:
        raise ValueError("expected_total must be positive")

    buffer: Dict[int, bytes] = {}
    for index, chunk in chunks:
        if len(chunk) > max_chunk_size:
            raise ValueError("chunk exceeds maximum size")
        buffer[index] = chunk

    if len(buffer) != expected_total:
        raise ValueError("missing chunks for reassembly")

    return b"".join(buffer[idx] for idx in range(expected_total))


