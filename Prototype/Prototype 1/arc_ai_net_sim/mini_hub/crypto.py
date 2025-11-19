"""
Mini Hub cryptographic helpers.

Wraps signature verification for knowledge capsules emitted by the main hub.
"""

from __future__ import annotations

import json

from common.crypto import verify_capsule


def verify_capsule_signature(capsule_dict: dict, verify_key_b64: str) -> bool:
    payload = json.dumps(
        {k: v for k, v in capsule_dict.items() if k != "signature"},
        sort_keys=True,
    ).encode("utf-8")
    signature = capsule_dict.get("signature", "")
    return verify_capsule(payload, signature, verify_key_b64)


