"""
Local cache helpers for Mini Hub service.

Encapsulates question hashing, cache hit evaluation, and fallback answer generation
to keep the FastAPI app lean.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from hashlib import sha256
from typing import Dict, Tuple


def compute_question_hash(question: str) -> str:
    return sha256(question.strip().lower().encode("utf-8")).hexdigest()


def is_capsule_fresh(capsule: Dict, ttl_days: int) -> bool:
    timestamp = datetime.fromisoformat(capsule["timestamp"])
    return datetime.now(timezone.utc) - timestamp <= timedelta(days=ttl_days)


def generate_fallback_answer(question: str) -> Tuple[str, float]:
    digest = sha256(question.encode("utf-8")).hexdigest()[:6]
    answer = f"[Fallback:{digest}] Unable to reach main hub. Providing interim guidance."
    return answer, 0.15


