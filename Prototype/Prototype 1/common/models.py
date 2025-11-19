"""
Shared data models for ARC-AI transport prototype.

Defines Pydantic models for packets, capsules, and manifests that mirror
the ARC-AI knowledge capsule exchange format.
"""

from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class KnowledgeCapsule(BaseModel):
    """Authoritative capsule emitted by Main Hub."""

    capsule_id: str = Field(..., description="UUID4 hex identifier.")
    question_hash: str
    question_text: str
    answer_text: str
    compressed_embedding: Optional[str] = None
    source_id: str
    timestamp: datetime
    signature: str


class PacketMeta(BaseModel):
    q_hash: Optional[str] = None
    priority: int = 1


class Packet(BaseModel):
    """Encrypted packet exchanged between hubs via network simulator."""

    pkt_id: str
    src_id: str
    dst_id: str
    timestamp: datetime
    payload_enc: str
    meta: PacketMeta = Field(default_factory=PacketMeta)
    chunk_index: int = 0
    total_chunks: int = 1

    def is_single_chunk(self) -> bool:
        return self.total_chunks == 1

    def packet_key(self) -> str:
        """Unique key for referencing this packet chunk."""

        return f"{self.pkt_id}:{self.chunk_index}"


class Manifest(BaseModel):
    """Manifest broadcast by Main Hub describing available capsules."""

    node_id: str
    capsule_ids: List[str]
    digests: Dict[str, str]
    timestamp: datetime


class AckResponse(BaseModel):
    """ACK/NAK response envelope used by network simulator."""

    pkt_id: str
    chunk_index: int
    status: str = Field(..., pattern="^(ACK|NAK)$")
    message: Optional[str] = None


class QueueItem(BaseModel):
    """Represents a pending packet to retransmit."""

    id: UUID
    pkt_id: str
    chunk_index: int
    attempt: int
    next_retry: datetime
    payload: dict


class QueryPayload(BaseModel):
    """Plaintext query payload sent from mini hub to main hub."""

    type: Literal["query"] = "query"
    user_id: str
    question: str
    context: Optional[str] = None
    capsule_hint_id: Optional[str] = None


class AuthoritativePayload(BaseModel):
    """Authoritative response payload returning a signed knowledge capsule."""

    type: Literal["authoritative_response"] = "authoritative_response"
    capsule: KnowledgeCapsule
    confidence: float


class ManifestPayload(BaseModel):
    """Manifest broadcast payload."""

    type: Literal["manifest"] = "manifest"
    manifest: Manifest


class UserMessage(BaseModel):
    """Represents a user-authored chat message."""

    message_id: str
    sender_id: str
    recipient_id: Optional[str] = None
    content: str
    timestamp: datetime
    source_hub_id: str
    target_hub_id: Optional[str] = None


class MessagePayload(BaseModel):
    """Payload carrying a chat message through the transport."""

    type: Literal["user_message"] = "user_message"
    message: UserMessage


class HubAck(BaseModel):
    """Acknowledgement envelope used by hubs when responding to network simulator."""

    status: str = Field(..., pattern="^(ACK|NAK)$")
    message: Optional[str] = None
    response_packet: Optional[Packet] = None
    needs_more_chunks: bool = False


