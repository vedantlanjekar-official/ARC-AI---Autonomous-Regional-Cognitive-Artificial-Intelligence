"""
Crypto helpers for ARC-AI transport prototype.

Implements:
- AES-GCM symmetric encryption for packet payload confidentiality.
- Ed25519 signing and verification for knowledge capsules.

NOTE: Production ARC-AI would derive per-session keys via X25519 (TODO).
"""

from __future__ import annotations

import base64
import os
from dataclasses import dataclass
from typing import Tuple

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from nacl import signing
from nacl.encoding import Base64Encoder


# TODO: replace static key management with X25519 exchange in production ARC-AI.
_DEFAULT_KEY_RAW = os.environ.get("ARC_AI_SESSION_KEY", "demo-session-key-32-bytes-demo-key")
_DEFAULT_KEY_BYTES = _DEFAULT_KEY_RAW.encode("utf-8")
if len(_DEFAULT_KEY_BYTES) < 32:
    _DEFAULT_KEY_BYTES = _DEFAULT_KEY_BYTES.ljust(32, b"0")
elif len(_DEFAULT_KEY_BYTES) > 32:
    _DEFAULT_KEY_BYTES = _DEFAULT_KEY_BYTES[:32]
DEFAULT_SESSION_KEY = _DEFAULT_KEY_BYTES


@dataclass
class AESGCMEnvelope:
    """Represents the encrypted payload components."""

    nonce: bytes
    ciphertext: bytes

    def to_base64(self) -> str:
        return base64.b64encode(self.nonce + self.ciphertext).decode("utf-8")

    def to_bytes(self) -> bytes:
        return self.nonce + self.ciphertext

    @classmethod
    def from_base64(cls, data: str) -> "AESGCMEnvelope":
        raw = base64.b64decode(data.encode("utf-8"))
        return cls(nonce=raw[:12], ciphertext=raw[12:])

    @classmethod
    def from_bytes(cls, data: bytes) -> "AESGCMEnvelope":
        return cls(nonce=data[:12], ciphertext=data[12:])


def encrypt_payload(plaintext: bytes, aad: bytes | None = None, session_key: bytes | None = None) -> AESGCMEnvelope:
    """Encrypt bytes with AES-GCM."""

    key = session_key or DEFAULT_SESSION_KEY
    if len(key) != 32:
        raise ValueError("AES-GCM key must be 32 bytes (256-bit).")

    nonce = os.urandom(12)
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(nonce, plaintext, aad)
    return AESGCMEnvelope(nonce=nonce, ciphertext=ciphertext)


def decrypt_payload(envelope: AESGCMEnvelope, aad: bytes | None = None, session_key: bytes | None = None) -> bytes:
    """Decrypt AES-GCM envelope."""

    key = session_key or DEFAULT_SESSION_KEY
    if len(key) != 32:
        raise ValueError("AES-GCM key must be 32 bytes (256-bit).")

    aesgcm = AESGCM(key)
    return aesgcm.decrypt(envelope.nonce, envelope.ciphertext, aad)


def generate_signing_keypair() -> Tuple[str, str]:
    """Generate a new Ed25519 signing/verify key pair encoded as base64 strings."""

    signer = signing.SigningKey.generate()
    verify = signer.verify_key
    return (
        signer.encode(encoder=Base64Encoder).decode("utf-8"),
        verify.encode(encoder=Base64Encoder).decode("utf-8"),
    )


def sign_capsule(payload: bytes, signing_key_b64: str) -> str:
    """Sign knowledge capsule bytes and return base64-encoded signature."""

    signer = signing.SigningKey(signing_key_b64.encode("utf-8"), encoder=Base64Encoder)
    signature = signer.sign(payload).signature
    return Base64Encoder.encode(signature).decode("utf-8")


def verify_capsule(payload: bytes, signature_b64: str, verify_key_b64: str) -> bool:
    """Verify knowledge capsule signature."""

    verify_key = signing.VerifyKey(verify_key_b64.encode("utf-8"), encoder=Base64Encoder)
    try:
        verify_key.verify(payload, Base64Encoder.decode(signature_b64.encode("utf-8")))
        return True
    except Exception:
        return False


