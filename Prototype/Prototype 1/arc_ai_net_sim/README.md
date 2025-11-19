Arc-AI Transport Prototype
=========================

Overview
--------

This repository delivers a reproducible Python prototype that simulates ARC-AI’s network/transport layer:

- **Network Simulator** (`network_sim/`): emulates latency, packet loss, bandwidth throttling, reordering, ACK/NAK responses, and optional auto-chunking for oversized packets.
- **Main Hub** (`main_hub/`): FastAPI service that processes encrypted query packets, produces signed Knowledge Capsules, persists them to SQLite, and broadcasts manifests.
- **Mini Hub** (`mini_hub/`): FastAPI service that provides user-facing querying with cache lookup, encrypted packetization, queueing/retransmission, manifest-driven selective sync, gossip, and fallback behaviour.
- **Shared Modules** (`common/`): packet models, crypto helpers (AES-GCM + Ed25519), chunking utilities, and SQLite accessors annotated with ARC-AI mapping comments.
- **Tooling** (`tools/`): scripts for key generation, seeding authoritative capsules, and executing demonstration scenarios.

Everything is built with Python 3.11+, FastAPI, SQLite, `cryptography`, `PyNaCl`, and asyncio-driven transports. Docker Compose definitions run one main hub, three mini hubs, and the network simulator.

Quick Start
-----------

```bash
# Install dependencies
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Generate keys for main + mini hubs
python tools/gen_keys.py --nodes main mh1 mh2 mh3

# Seed initial capsules on the main hub (after service is up)
python tools/seed_capsules.py --main-host http://localhost:8000 --file seeds/initial_capsules.json
```

Run Services
------------

### Docker Compose

```bash
docker compose up --build
```

Services exposed:

- Network simulator: `http://localhost:9000`
- Main hub: `http://localhost:8000`
- Mini hubs: `http://localhost:8101`, `:8102`, `:8103`

### Manual

```bash
# Terminal 1 – network simulator
python -m network_sim.sim_server --port 9000

# Terminal 2 – main hub
uvicorn main_hub.app:app --port 8000

# Terminal 3 – mini hub mh1
MINI_HUB_ID=mh1 uvicorn mini_hub.app:app --port 8101
```

Demonstrations
--------------

After services are running and capsules seeded:

```bash
bash tools/run_demos.sh
```

This executes:

1. **Cache Hit** – verifies seeded capsules are served locally.
2. **Authoritative Flow** – sends a novel question through the full transport path and logs the signed capsule ingestion.
3. **Offline & Reconciliation** – temporarily increases simulated packet loss to force fallback, restores connectivity, and confirms queue-driven reconciliation.

Example API Calls
-----------------

```bash
# Cache hit (after seeding)
curl -X POST http://localhost:8101/query \
  -H "Content-Type: application/json" \
  -d '{"user_id":"u1","question":"What is photosynthesis?"}'

# Cache miss -> authoritative flow
curl -X POST http://localhost:8102/query \
  -H "Content-Type: application/json" \
  -d '{"user_id":"u2","question":"How do quantum computers work?"}'

# Inspect stored capsules on mini hub mh1
curl http://localhost:8101/capsules/list

# Fetch latest manifest from main hub
curl http://localhost:8000/manifests/latest
```

Configuration Knobs
-------------------

| Setting | Description | Default |
| --- | --- | --- |
| `NETWORK_SIM_LATENCY_MS` | Base one-way latency (ms) | 250 |
| `NETWORK_SIM_PACKET_LOSS_PCT` | Packet drop probability (%) | 5 |
| `NETWORK_SIM_MAX_CHUNK_SIZE_BYTES` | Max chunk size before fragmentation | 800 |
| `NETWORK_SIM_BANDWIDTH_BYTES_PER_SEC` | Throughput pacing | 1024 |
| `NETWORK_SIM_AUTO_CHUNK_LARGE_PAYLOADS` | Auto-fragment oversize packets | True |
| `RETRANSMIT_MAX_RETRIES` | Max retransmit attempts | 6 |
| `RETRANSMIT_BASE_BACKOFF_SECONDS` | Initial backoff delay | 0.5 |
| `RETRANSMIT_BACKOFF_MULTIPLIER` | Backoff multiplier | 2.0 |
| `CAPSULE_MANIFEST_INTERVAL_SECONDS` | Main hub manifest broadcast period | 30 |
| `CAPSULE_GOSSIP_INTERVAL_SECONDS` | Mini hub manifest poll interval | 45 |
| `CAPSULE_TTL_DAYS` | Cache freshness window | 90 |
| `MINI_HUB_SIMILARITY_THRESHOLD` | Cache hit threshold (stub) | 0.78 |

Runtime settings can also be tweaked dynamically via the network simulator admin endpoint:

```bash
curl -X POST http://localhost:9000/admin/config \
  -H "Content-Type: application/json" \
  -d '{"packet_loss_pct": 30, "enable_reordering": true}'
```

Testing
-------

```bash
pytest
```

Pytest coverage includes:

- Auto-chunking and reassembly through the network simulator with encrypted payloads.
- Packet loss handling returning NAK responses.
- Ed25519 signature verification and tamper detection.
- Manifest-driven selective sync fetching missing capsules into a mini hub.

Acceptance Mapping
------------------

- **Packet transfer & reassembly** – `tests/test_network_sim.py::test_network_sim_auto_chunk_and_reassembly`.
- **Packet loss & retransmit semantics** – `tests/test_network_sim.py::test_network_sim_packet_loss_results_in_nak`.
- **Signature verification** – `tests/test_crypto_and_manifest.py::test_signature_verification_round_trip`.
- **Manifest sync & selective fetch** – `tests/test_crypto_and_manifest.py::test_manifest_sync_fetches_missing_capsules`.
- **Offline queue & reconciliation** – covered by `tools/demo_runner.py` offline scenario and queue logic in `mini_hub/app.py`.

ARC-AI Mapping
--------------

- **Knowledge Capsule** – `common/models.py::KnowledgeCapsule`, persisted via `common/db.py::insert_capsule`.
- **Transport Layer** – `network_sim/sim_server.py` simulates LoRa-like behaviour, including ACK/NAK and chunking.
- **Mini Hub Queueing & Retransmit** – `mini_hub/app.py` + `mini_hub/queue.py` implement exponential backoff and reconciliation.
- **Manifest Gossip** – `main_hub/app.py::manifest_broadcast_loop` and `mini_hub/app.py::manifest_poll_loop` propagate capsule manifests and fetch selectively.
- **Crypto Controls** – `common/crypto.py` (AES-GCM) and `mini_hub/crypto.py`/`main_hub/app.py` (Ed25519 signing and verification).

Next Steps
----------

- Replace static AES session key with X25519-derived per-session keys (TODO in `common/crypto.py`).
- Swap stubbed cache similarity for a real embedding index (hooks left in `mini_hub/cache.py`).
- Extend tooling for distributed deployment and richer telemetry dashboards.

