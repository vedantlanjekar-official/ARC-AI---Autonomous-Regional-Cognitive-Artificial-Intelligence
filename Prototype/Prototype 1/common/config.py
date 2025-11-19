"""
Configuration loader for the ARC-AI transport prototype.

Exposes typed settings shared by the main hub, mini hubs, and network simulator.
Config values can be overridden via environment variables or `.env` files.
"""

from __future__ import annotations

from functools import lru_cache
from typing import List, Optional

from pydantic import Field
from pydantic_settings import BaseSettings


class NetworkSimSettings(BaseSettings):
    """Tunable knobs for the virtual transport layer."""

    latency_ms: int = Field(250, ge=0, description="Base one-way latency in milliseconds.")
    packet_loss_pct: float = Field(5.0, ge=0.0, le=100.0, description="Packet drop probability percentage.")
    max_chunk_size_bytes: int = Field(
        800, ge=128, description="Maximum payload size per packet chunk before fragmentation occurs."
    )
    bandwidth_bytes_per_sec: int = Field(
        1024, ge=128, description="Effective throughput budget used to pace chunk emission."
    )
    enable_reordering: bool = Field(
        False, description="When true, the simulator may reorder packets to mimic unstable links."
    )
    auto_chunk_large_payloads: bool = Field(
        True,
        description="When true, the simulator will fragment oversized packets automatically using shared chunker.",
    )

    class Config:
        env_prefix = "NETWORK_SIM_"
        case_sensitive = False


class RetransmitSettings(BaseSettings):
    """Reliability/backoff controls for queueing and retransmits."""

    max_retries: int = Field(6, ge=0)
    base_backoff_seconds: float = Field(0.5, gt=0)
    backoff_multiplier: float = Field(2.0, gt=1.0)

    class Config:
        env_prefix = "RETRANSMIT_"
        case_sensitive = False


class CapsuleSettings(BaseSettings):
    """Knowledge capsule lifecycle configuration."""

    capsule_ttl_days: int = Field(90, ge=1)
    manifest_interval_seconds: int = Field(30, ge=5, description="Frequency for manifest gossip broadcast.")
    gossip_interval_seconds: int = Field(45, ge=5, description="Frequency for mini hubs to request manifests.")

    class Config:
        env_prefix = "CAPSULE_"
        case_sensitive = False


class MiniHubSettings(BaseSettings):
    """Mini Hub behavior toggles."""

    node_id: str = Field("mh-default", description="Identifier used in packets and manifests.")
    main_hub_url: str = Field("http://localhost:8000", description="Authority endpoint for manifests and capsules.")
    network_sim_url: str = Field("http://localhost:9000", description="Transport emulator base URL.")
    similarity_threshold: float = Field(0.78, ge=0.0, le=1.0, description="Cache hit threshold (stubbed logic).")
    sqlite_path: str = Field("mini_hub.db", description="SQLite database for cache, queue, and state.")
    callback_url: str = Field(
        "http://localhost:8100/recv_packet",
        description="Callback URL for network simulator deliveries to this mini hub.",
    )
    main_hub_node_id: str = Field("main-hub", description="Main hub node identifier.")
    main_hub_verify_key: Optional[str] = Field(
        None, description="Optional override for main hub Ed25519 verify key (base64)."
    )

    class Config:
        env_prefix = "MINI_HUB_"
        case_sensitive = False


class MainHubSettings(BaseSettings):
    """Main Hub configuration values."""

    node_id: str = Field("main-hub", description="Identifier broadcast to mini hubs.")
    sqlite_path: str = Field("main_hub.db", description="SQLite database for authoritative state.")
    network_sim_url: str = Field("http://localhost:9000", description="Transport emulator base URL.")
    callback_url: str = Field(
        "http://localhost:8000/process_packet",
        description="Callback URL that the network simulator should use to deliver packets.",
    )
    known_mini_hubs: List[str] = Field(
        default_factory=lambda: ["mh1", "mh2", "mh3"],
        description="List of mini hub IDs to target during manifest broadcast.",
    )

    class Config:
        env_prefix = "MAIN_HUB_"
        case_sensitive = False


class Settings(BaseSettings):
    """Aggregate umbrella settings. Individual services select their subset."""

    network_sim: NetworkSimSettings = NetworkSimSettings()
    retransmit: RetransmitSettings = RetransmitSettings()
    capsule: CapsuleSettings = CapsuleSettings()
    mini_hub: MiniHubSettings = MiniHubSettings()
    main_hub: MainHubSettings = MainHubSettings()

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached Settings object so repeated imports share one instance."""

    return Settings()


def get_network_sim_settings(override: Optional[dict] = None) -> NetworkSimSettings:
    """Helper used by the simulator to allow runtime overrides in tests."""

    if override:
        return NetworkSimSettings(**override)
    return get_settings().network_sim


