# ARC-AI (AI Resource Capsule - Artificial Intelligence)

[![Project Status](https://img.shields.io/badge/status-active%20development-green.svg)]()
[![Python](https://img.shields.io/badge/python-3.11+-blue.svg)]()
[![Node.js](https://img.shields.io/badge/node.js-18+-green.svg)]()

## Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Solution Architecture](#solution-architecture)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [Quick Start](#quick-start)
- [Usage Guide](#usage-guide)
- [API Documentation](#api-documentation)
- [Configuration](#configuration)
- [Testing](#testing)
- [Deployment](#deployment)
- [Technology Stack](#technology-stack)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**ARC-AI** is an innovative distributed knowledge-sharing system designed to operate in low-bandwidth, unreliable network environments. It enables secure, authenticated transmission of AI-generated knowledge capsules between nodes using a hub-based architecture with sophisticated transport layer simulation.

### Core Concept

ARC-AI introduces **Knowledge Capsules** - encrypted, signed units of information (question-answer pairs) that can be securely transmitted, cached, and verified across a distributed network. The system is designed to work even in challenging network conditions similar to LoRa networks, with features like:

- Packet chunking and reassembly
- Automatic retransmission with exponential backoff
- Manifest-based gossip protocol for capsule discovery
- Offline-capable local LLM processing
- End-to-end encryption and signature verification

---

## Problem Statement

Traditional cloud-based AI systems face several limitations:

1. **Network Dependency**: Require constant internet connectivity
2. **Privacy Concerns**: User queries processed on remote servers
3. **Latency Issues**: Slow response times in low-bandwidth scenarios
4. **Centralization**: Single points of failure
5. **Cost**: Expensive API calls for every query

ARC-AI addresses these by providing:
- **Offline-first architecture** with local LLM processing
- **Distributed caching** via Knowledge Capsules
- **Resilient transport** for unreliable networks
- **Privacy-preserving** end-to-end encryption
- **Cost-effective** knowledge sharing through capsule reuse

---

## Solution Architecture

ARC-AI uses a **hub-based distributed architecture**:

### Components

1. **Main Hub** (Authoritative Node)
   - Processes novel queries using local LLM
   - Generates and signs Knowledge Capsules
   - Broadcasts capsule manifests periodically
   - Maintains authoritative capsule registry

2. **Mini Hub** (Edge Node)
   - User-facing query interface
   - Local capsule cache with similarity matching
   - Queue management for offline scenarios
   - Selective sync via manifest gossip

3. **Network Simulator**
   - Emulates real-world network conditions
   - Packet loss, latency, bandwidth throttling
   - ACK/NAK response simulation
   - Automatic chunking for large payloads

4. **Knowledge Capsules**
   - Encrypted question-answer pairs
   - Ed25519 digital signatures
   - Timestamped and versioned
   - Reusable across network nodes

---

## Key Features

### 🔐 Security & Privacy
- **End-to-end encryption** using AES-GCM
- **Digital signatures** with Ed25519
- **Authenticated communication** between hubs
- **Privacy-preserving** query processing

### 🌐 Network Resilience
- **Packet chunking** for large payloads
- **Automatic retransmission** with exponential backoff
- **Manifest-based gossip** for capsule discovery
- **Offline queue** with reconciliation

### 🚀 Performance
- **Local caching** with similarity matching
- **Reduced latency** through edge caching
- **Bandwidth optimization** via manifest selective sync
- **Asynchronous processing** with async/await

### 🤖 AI Integration
- **Local LLM support** (llama.cpp, 7B quantized models)
- **Offline processing** capabilities
- **Multiple LLM adapters** (OpenAI, Gemini, local)
- **Configurable model parameters**

### 📊 Observability
- **Timeline tracking** for packet journey
- **Health monitoring** endpoints
- **Metrics collection** (latency, success rate)
- **Structured logging** across all services

---

## System Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  Mini Hub 1 │────────▶│  Main Hub   │────────▶│  Mini Hub 2 │
│  (Edge)     │         │ (Authority) │         │   (Edge)    │
└─────────────┘         └─────────────┘         └─────────────┘
       │                       │                       │
       │                       │                       │
       └───────────────────────┼───────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Network Simulator  │
                    │  (Transport Layer)  │
                    └─────────────────────┘
```

### Data Flow

1. **Query Request**: User submits query to Mini Hub
2. **Cache Check**: Mini Hub checks local cache for similar capsules
3. **Cache Hit**: If found, return cached capsule
4. **Cache Miss**: Forward query to Main Hub via Network Simulator
5. **Processing**: Main Hub processes with local LLM (or external API)
6. **Capsule Creation**: Main Hub generates and signs Knowledge Capsule
7. **Response**: Capsule transmitted back to Mini Hub
8. **Storage**: Mini Hub caches capsule for future use
9. **Gossip**: Manifest broadcast enables other Mini Hubs to discover capsule

---

## Project Structure

```
ARC - AI/
├── Documentation/              # Project documentation (PDFs)
│   ├── Abstract.pdf
│   ├── Problem Statement.pdf
│   ├── Solution.pdf
│   ├── System Architecture.pdf
│   ├── Tech Stack.pdf
│   ├── Benefits & Impact.pdf
│   ├── Feasibility & Viability.pdf
│   ├── Future Aspects.pdf
│   ├── Key Features & USP.pdf
│   ├── Patent Claims.pdf
│   ├── India-Focused Business Plan & Scalability.pdf
│   └── Datasets Required.pdf
│
├── Prototype/
│   ├── Prototype 1/           # Network simulation prototype
│   │   ├── arc_ai_net_sim/    # Main network simulation implementation
│   │   │   ├── common/        # Shared modules
│   │   │   │   ├── config.py      # Configuration management
│   │   │   │   ├── models.py      # Pydantic data models
│   │   │   │   ├── crypto.py      # Encryption & signing
│   │   │   │   ├── db.py          # SQLite database operations
│   │   │   │   ├── chunker.py     # Packet chunking utilities
│   │   │   │   └── logging.py     # Logging configuration
│   │   │   ├── main_hub/      # Authoritative hub service
│   │   │   │   ├── app.py         # FastAPI application
│   │   │   │   └── Dockerfile
│   │   │   ├── mini_hub/      # Edge hub service
│   │   │   │   ├── app.py         # FastAPI application
│   │   │   │   ├── cache.py       # Cache management
│   │   │   │   ├── queue.py       # Queue & retransmission
│   │   │   │   └── Dockerfile
│   │   │   ├── network_sim/   # Network simulator
│   │   │   │   ├── sim_server.py  # Simulator server
│   │   │   │   └── sim_client_lib.py  # Client library
│   │   │   ├── tools/         # Utility scripts
│   │   │   │   ├── gen_keys.py        # Key generation
│   │   │   │   ├── seed_capsules.py   # Seed initial data
│   │   │   │   └── demo_runner.py     # Demo scenarios
│   │   │   ├── tests/         # Test suite
│   │   │   │   ├── test_network_sim.py
│   │   │   │   ├── test_crypto_and_manifest.py
│   │   │   │   └── test_message_flow.py
│   │   │   ├── docker-compose.yml
│   │   │   └── requirements.txt
│   │   │
│   │   ├── arc-ai-mini/       # Full-stack prototype (Node.js + React)
│   │   │   ├── services/
│   │   │   │   ├── mini_hub/  # Mini hub service (Node.js)
│   │   │   │   ├── main_hub/  # Main hub service (Node.js)
│   │   │   │   └── person_b/  # Deterministic solver
│   │   │   └── web/           # React frontend (Vite)
│   │   │
│   │   ├── frontend/          # Alternative frontend (Python/Flask + React)
│   │   │   ├── app.py         # Flask backend
│   │   │   └── src/           # React TypeScript frontend
│   │   │
│   │   ├── main_hub/          # Standalone main hub
│   │   ├── mini_hub/          # Standalone mini hub
│   │   ├── network_sim/       # Standalone network simulator
│   │   ├── common/            # Shared Python modules
│   │   ├── tools/             # Utility scripts
│   │   ├── tests/             # Test files
│   │   ├── docker-compose.yml # Docker orchestration
│   │   └── requirements.txt   # Python dependencies
│   │
│   └── Prototype 2/           # MQTT-based prototype
│       ├── arc-ai/            # Main hub with MQTT
│       │   ├── main_hub/
│       │   │   ├── app.py         # FastAPI + MQTT
│       │   │   ├── mqtt_client.py # MQTT integration
│       │   │   └── llm_adapters.py # LLM adapters
│       │   └── mini_hub.py        # Mini hub service
│       │
│       ├── arc-ai mini/       # Standalone mini hub
│       │   ├── mini_hub.py
│       │   └── mini_hub_web.py
│       │
│       └── arc-ai app/        # Next.js web application
│           ├── app/           # Next.js app router
│           ├── components/    # React components
│           └── lib/           # Utility libraries
│
├── Presentation/              # Presentation materials
├── Logo.png                   # Project logo
├── Header.png                 # Project header image
└── README.md                  # This file
```

---

## Installation & Setup

### Prerequisites

- **Python 3.11+** (for backend services)
- **Node.js 18+** (for frontend and some services)
- **Docker & Docker Compose** (optional, for containerized deployment)
- **SQLite3** (included with Python)
- **Git** (for cloning the repository)

### System Requirements

- **RAM**: Minimum 4GB (8GB+ recommended for local LLM)
- **Storage**: 2GB+ free space
- **OS**: Windows, macOS, or Linux

### Backend Setup (Python)

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd "ARC - AI"
   ```

2. **Create virtual environment**:
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install Python dependencies**:
   ```bash
   cd Prototype/Prototype\ 1
   pip install -r requirements.txt
   ```

### Frontend Setup (Node.js)

1. **Navigate to frontend directory**:
   ```bash
   cd Prototype/Prototype\ 1/arc-ai-mini/web
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

### Docker Setup (Optional)

1. **Build and run with Docker Compose**:
   ```bash
   cd Prototype/Prototype\ 1/arc_ai_net_sim
   docker compose up --build
   ```

This will start:
- Network Simulator on `http://localhost:9000`
- Main Hub on `http://localhost:8000`
- Three Mini Hubs on `http://localhost:8101`, `:8102`, `:8103`

### Local LLM Setup (Optional, for Prototype 2)

For offline AI processing:

1. **Install llama.cpp**:
   ```bash
   # macOS (Homebrew)
   brew install llama.cpp

   # Or build from source
   git clone https://github.com/ggerganov/llama.cpp.git
   cd llama.cpp
   make
   ```

2. **Download a 7B quantized model**:
   ```bash
   # Using Hugging Face CLI
   pip install huggingface_hub
   huggingface-cli download TheBloke/Llama-2-7B-Chat-GGUF llama-2-7b-chat.Q4_K_M.gguf
   ```

3. **Configure in `config.yaml`**:
   ```yaml
   adapter:
     type: subprocess
     model_path: /path/to/model.gguf
     llama_cpp_path: llama-cli
   ```

---

## Quick Start

### Option 1: Network Simulation Prototype (Prototype 1)

1. **Generate cryptographic keys**:
   ```bash
   cd Prototype/Prototype\ 1/arc_ai_net_sim
   python tools/gen_keys.py --nodes main mh1 mh2 mh3
   ```

2. **Start services** (using Docker Compose):
   ```bash
   docker compose up --build
   ```

   Or manually:
   ```bash
   # Terminal 1: Network Simulator
   python -m network_sim.sim_server --port 9000

   # Terminal 2: Main Hub
   uvicorn main_hub.app:app --port 8000

   # Terminal 3: Mini Hub 1
   MINI_HUB_ID=mh1 uvicorn mini_hub.app:app --port 8101
   ```

3. **Seed initial capsules** (after services are up):
   ```bash
   python tools/seed_capsules.py --main-host http://localhost:8000 --file seeds/initial_capsules.json
   ```

4. **Run demonstrations**:
   ```bash
   bash tools/run_demos.sh
   ```

### Option 2: Full-Stack Prototype (arc-ai-mini)

1. **Navigate to project directory**:
   ```bash
   cd Prototype/Prototype\ 1/arc-ai-mini
   ```

2. **Run startup script**:
   ```bash
   # Windows (Git Bash)
   ./scripts/start.sh

   # Or manually
   npm install
   npm run install:all
   npm run start:all
   ```

3. **Access web UI**: Open `http://localhost:5173` in your browser

### Option 3: MQTT-based Prototype (Prototype 2)

1. **Install Mosquitto MQTT Broker**:
   ```bash
   # macOS
   brew install mosquitto
   brew services start mosquitto

   # Linux
   sudo apt-get install mosquitto
   sudo systemctl start mosquitto
   ```

2. **Configure and start Main Hub**:
   ```bash
   cd Prototype/Prototype\ 2/arc-ai/arc-ai
   pip install -r requirements.txt
   python main_hub/app.py
   ```

3. **Start Mini Hub** (in separate terminal):
   ```bash
   python mini_hub/mini_hub.py <MQTT_BROKER_IP>
   ```

---

## Usage Guide

### Basic Query Flow

1. **Send a query to Mini Hub**:
   ```bash
   curl -X POST http://localhost:8101/query \
     -H "Content-Type: application/json" \
     -d '{
       "user_id": "user123",
       "question": "What is photosynthesis?"
     }'
   ```

2. **Check cache status**:
   ```bash
   curl http://localhost:8101/capsules/list
   ```

3. **Fetch manifest from Main Hub**:
   ```bash
   curl http://localhost:8000/manifests/latest
   ```

### Web Interface (arc-ai-mini)

1. **Register an account**:
   - Navigate to `http://localhost:5173`
   - Click "Sign Up"
   - Enter username and password

2. **Send a packet**:
   - Log in to dashboard
   - Enter message in the dispatch form
   - Click "Send"
   - View timeline in real-time

3. **View packet history**:
   - Access packet table in dashboard
   - Click on packet ID to view detailed timeline
   - See delivery statistics

### API Authentication (arc-ai-mini)

1. **Register**:
   ```bash
   curl -X POST http://localhost:3000/auth/register \
     -H "Content-Type: application/json" \
     -d '{"username":"operator","password":"secret123"}'
   ```

2. **Login** (save token):
   ```bash
   TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"operator","password":"secret123"}' | jq -r '.token')
   ```

3. **Send authenticated query**:
   ```bash
   curl -X POST http://localhost:3000/query \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "packet": {
         "pkt_id": "pkt-001",
         "dst": "person_b",
         "timestamp": "2025-01-15T10:00:00Z",
         "payload": "Hello, can you help?"
       },
       "client_timeline": ["web_ui: operator prepared packet"]
     }'
   ```

---

## API Documentation

### Main Hub Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/healthz` | GET | Health check |
| `/process_packet` | POST | Receive encrypted packet from network simulator |
| `/manifests/latest` | GET | Get latest capsule manifest |
| `/capsules/{capsule_id}` | GET | Retrieve specific capsule |
| `/metrics` | GET | Service metrics (requests, latency, success rate) |

### Mini Hub Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/healthz` | GET | Health check |
| `/query` | POST | Submit user query (checks cache, forwards if miss) |
| `/capsules/list` | GET | List cached capsules |
| `/capsules/{capsule_id}` | GET | Retrieve cached capsule |
| `/recv_packet` | POST | Receive packet from network simulator |

### Network Simulator Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/send_packet` | POST | Submit packet for transmission |
| `/admin/config` | POST | Update simulation parameters |

### Example Request/Response

**Query Request**:
```json
{
  "user_id": "user123",
  "question": "What is machine learning?",
  "context": "Educational query",
  "capsule_hint_id": "optional-existing-capsule-id"
}
```

**Query Response**:
```json
{
  "capsule_id": "550e8400-e29b-41d4-a716-446655440000",
  "question_text": "What is machine learning?",
  "answer_text": "Machine learning is a subset of artificial intelligence...",
  "source_id": "main-hub",
  "timestamp": "2025-01-15T10:00:00Z",
  "signature": "base64-encoded-signature",
  "cached": false
}
```

---

## Configuration

### Environment Variables

#### Network Simulator
```bash
NETWORK_SIM_LATENCY_MS=250                    # Base latency in milliseconds
NETWORK_SIM_PACKET_LOSS_PCT=5.0               # Packet loss percentage
NETWORK_SIM_MAX_CHUNK_SIZE_BYTES=800          # Max chunk size before fragmentation
NETWORK_SIM_BANDWIDTH_BYTES_PER_SEC=1024      # Throughput limit
NETWORK_SIM_AUTO_CHUNK_LARGE_PAYLOADS=true    # Auto-chunk oversized packets
NETWORK_SIM_ENABLE_REORDERING=false           # Enable packet reordering
```

#### Retransmission
```bash
RETRANSMIT_MAX_RETRIES=6                      # Maximum retry attempts
RETRANSMIT_BASE_BACKOFF_SECONDS=0.5           # Initial backoff delay
RETRANSMIT_BACKOFF_MULTIPLIER=2.0             # Exponential backoff multiplier
```

#### Capsule Settings
```bash
CAPSULE_TTL_DAYS=90                           # Cache freshness window
CAPSULE_MANIFEST_INTERVAL_SECONDS=30          # Manifest broadcast frequency
CAPSULE_GOSSIP_INTERVAL_SECONDS=45            # Mini hub manifest poll frequency
```

#### Mini Hub
```bash
MINI_HUB_ID=mh1                               # Mini hub identifier
MINI_HUB_MAIN_HUB_URL=http://localhost:8000   # Main hub endpoint
MINI_HUB_NETWORK_SIM_URL=http://localhost:9000 # Network simulator endpoint
MINI_HUB_SQLITE_PATH=mini_hub.db              # Database file path
MINI_HUB_SIMILARITY_THRESHOLD=0.78            # Cache hit similarity threshold
```

#### Main Hub
```bash
MAIN_HUB_NODE_ID=main-hub                     # Main hub identifier
MAIN_HUB_SQLITE_PATH=main_hub.db              # Database file path
MAIN_HUB_NETWORK_SIM_URL=http://localhost:9000 # Network simulator endpoint
```

### Configuration Files

#### `config.yaml` (Prototype 2 - MQTT)
```yaml
broker:
  host: 0.0.0.0
  port: 1883

adapter:
  type: subprocess
  model_path: ~/models/model.gguf
  llama_cpp_path: llama-cli
  threads: 4
  n_ctx: 2048
  max_tokens: 256
  temperature: 0.2
```

#### `docker-compose.yml`
See `Prototype/Prototype 1/arc_ai_net_sim/docker-compose.yml` for service configuration.

---

## Testing

### Running Tests

```bash
cd Prototype/Prototype\ 1/arc_ai_net_sim
pytest
```

### Test Coverage

The test suite includes:

- **Network Simulation Tests** (`test_network_sim.py`):
  - Packet chunking and reassembly
  - Packet loss handling (NAK responses)
  - Bandwidth throttling
  - Packet reordering

- **Crypto & Manifest Tests** (`test_crypto_and_manifest.py`):
  - Encryption/decryption (AES-GCM)
  - Signature generation and verification (Ed25519)
  - Manifest creation and parsing
  - Selective sync functionality

- **Message Flow Tests** (`test_message_flow.py`):
  - End-to-end query flow
  - Cache hit scenarios
  - Cache miss scenarios
  - Retransmission logic

### Running Specific Tests

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_network_sim.py

# Run specific test function
pytest tests/test_network_sim.py::test_network_sim_auto_chunk_and_reassembly

# Run with coverage
pytest --cov=. --cov-report=html
```

---

## Deployment

### Docker Deployment

1. **Build images**:
   ```bash
   docker compose build
   ```

2. **Start services**:
   ```bash
   docker compose up -d
   ```

3. **View logs**:
   ```bash
   docker compose logs -f
   ```

4. **Stop services**:
   ```bash
   docker compose down
   ```

### Production Considerations

1. **Security**:
   - Use strong session keys (set `ARC_AI_SESSION_KEY` environment variable)
   - Enable HTTPS for web interfaces
   - Implement rate limiting
   - Use production-grade MQTT broker with TLS

2. **Database**:
   - Consider PostgreSQL for production (instead of SQLite)
   - Implement database backups
   - Set up connection pooling

3. **Monitoring**:
   - Set up health check endpoints
   - Implement logging aggregation (ELK stack, Grafana)
   - Monitor resource usage (CPU, memory, disk)

4. **Scaling**:
   - Use load balancer for multiple Mini Hubs
   - Implement database replication for Main Hub
   - Consider message queue (RabbitMQ, Redis) for async processing

### Kubernetes Deployment (Future)

Kubernetes manifests can be created for:
- Main Hub deployment
- Mini Hub StatefulSets
- Network Simulator service
- ConfigMaps and Secrets
- PersistentVolumeClaims for databases

---

## Technology Stack

### Backend

- **Python 3.11+**: Core language
- **FastAPI**: Web framework for REST APIs
- **SQLite**: Embedded database
- **SQLAlchemy**: ORM (for future PostgreSQL migration)
- **cryptography**: AES-GCM encryption
- **PyNaCl**: Ed25519 digital signatures
- **Pydantic**: Data validation and models
- **httpx**: Async HTTP client
- **asyncio**: Asynchronous programming

### Frontend

- **React 18+**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **Next.js 14**: Full-stack framework (Prototype 2)
- **Tailwind CSS**: Utility-first CSS
- **React Router**: Client-side routing

### Infrastructure

- **Docker**: Containerization
- **Docker Compose**: Multi-container orchestration
- **MQTT (Mosquitto)**: Message broker (Prototype 2)
- **llama.cpp**: Local LLM inference (Prototype 2)

### Development Tools

- **pytest**: Testing framework
- **pytest-asyncio**: Async test support
- **pytest-cov**: Coverage reporting
- **ESLint**: JavaScript/TypeScript linting
- **Black**: Python code formatting (recommended)

---

## Documentation

### PDF Documentation

Comprehensive documentation is available in the `Documentation/` directory:

- **Abstract.pdf**: Project overview and summary
- **Problem Statement.pdf**: Detailed problem analysis
- **Solution.pdf**: Architecture and solution design
- **System Architecture.pdf**: Technical architecture diagrams
- **Tech Stack.pdf**: Technology choices and rationale
- **Key Features & USP.pdf**: Unique selling points
- **Benefits & Impact.pdf**: Business and social impact
- **Feasibility & Viability.pdf**: Feasibility study
- **Future Aspects.pdf**: Roadmap and future enhancements
- **India-Focused Business Plan & Scalability.pdf**: Business plan
- **Patent Claims.pdf**: Intellectual property information
- **Datasets Required.pdf**: Data requirements

### Code Documentation

- Inline comments throughout codebase
- Docstrings for all functions and classes
- Type hints for better IDE support

---

## Contributing

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make changes** and test thoroughly
4. **Commit with descriptive messages**:
   ```bash
   git commit -m "Add feature: description"
   ```
5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
6. **Create a Pull Request**

### Code Style

- **Python**: Follow PEP 8, use type hints
- **JavaScript/TypeScript**: Follow ESLint configuration
- **Commit messages**: Use conventional commits format

### Testing Requirements

- All new features must include tests
- Maintain or improve test coverage
- All tests must pass before PR submission

---

## License

[Specify license here - e.g., MIT, Apache 2.0, Proprietary]

---

## Contact & Support

- **Project Repository**: [GitHub URL]
- **Issue Tracker**: [GitHub Issues URL]
- **Documentation**: See `Documentation/` directory
- **Email**: [Contact email]

---

## Acknowledgments

- Thanks to all contributors and testers
- Inspired by distributed systems research
- Built with open-source tools and libraries

---

## Changelog

### Version 2.0 (Prototype 2)
- Added MQTT-based communication
- Integrated local LLM support (llama.cpp)
- Next.js web application
- macOS-focused offline deployment

### Version 1.0 (Prototype 1)
- Initial network simulation prototype
- FastAPI-based hub services
- Knowledge Capsule system
- Manifest gossip protocol
- Docker deployment support

---

**Last Updated**: January 2025

