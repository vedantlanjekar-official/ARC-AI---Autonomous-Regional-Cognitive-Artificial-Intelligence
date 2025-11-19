# Main Hub - Offline AI Assistant

A completely offline Main Hub application for macOS that receives requests via MQTT, processes them using a local 7B quantized LLM (via llama.cpp), and sends responses back through MQTT.

## Features

- ✅ **Completely Offline** - No internet required at runtime
- ✅ **MQTT Communication** - Receives requests from Mini Hub via Mosquitto
- ✅ **Local LLM** - Uses llama.cpp with 7B quantized GGUF models
- ✅ **FastAPI Admin** - Health checks, metrics, and request history
- ✅ **Apple Silicon Optimized** - Automatically uses Metal acceleration

## Prerequisites

- macOS (Apple Silicon or Intel)
- Python 3.11+
- Homebrew (for installing Mosquitto)

## Installation

### 1. Install Mosquitto MQTT Broker

```bash
brew install mosquitto
brew services start mosquitto
```

Verify it's running:
```bash
brew services list | grep mosquitto
```

### 2. Install Python Dependencies

```bash
pip3 install -r requirements.txt
```

### 3. Install llama.cpp

```bash
# Clone and build llama.cpp
git clone https://github.com/ggerganov/llama.cpp.git
cd llama.cpp
make

# Add to PATH (add to ~/.zshrc or ~/.bash_profile)
export PATH="$PATH:$(pwd)"
```

Or install via Homebrew (if available):
```bash
brew install llama.cpp
```

### 4. Download 7B GGUF Model

You have several options:

#### Option A: Using Hugging Face CLI

```bash
pip3 install huggingface_hub
huggingface-cli login  # Paste your token when prompted

python3 << 'PY'
from huggingface_hub import hf_hub_download

repo = "TheBloke/Llama-2-7B-Chat-GGUF"
filename = "llama-2-7b-chat.Q4_K_M.gguf"
path = hf_hub_download(repo_id=repo, filename=filename)
print(f"Model downloaded to: {path}")
PY
```

#### Option B: Manual Download

1. Visit [TheBloke's Hugging Face](https://huggingface.co/TheBloke)
2. Find a 7B GGUF model (e.g., `Llama-2-7B-Chat-GGUF`)
3. Download the `Q4_K_M` quantized version
4. Save it to `~/main_hub/models/model.gguf`

#### Option C: Using curl (if direct link available)

```bash
mkdir -p ~/main_hub/models
cd ~/main_hub/models
# Replace URL with actual model download link
curl -L -o model.gguf "https://huggingface.co/TheBloke/Llama-2-7B-Chat-GGUF/resolve/main/llama-2-7b-chat.Q4_K_M.gguf"
```

### 5. Configure the Application

Edit `main_hub/config.yaml`:

```yaml
broker:
  host: 0.0.0.0  # Use your Mac's IP for hotspot/ethernet, or 0.0.0.0 for all interfaces
  port: 1883

adapter:
  type: subprocess
  model_path: ~/main_hub/models/model.gguf  # Update with your model path
  llama_cpp_path: llama-cli  # Or full path like /path/to/llama.cpp/llama-cli
  threads: 4
  n_ctx: 2048
  max_tokens: 256
  temperature: 0.2
```

**Important**: Update `model_path` with the actual path to your downloaded model.

### 6. Find Your Mac's IP Address

For Wi-Fi hotspot or Ethernet connection:

```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

Use this IP address in the Mini Hub configuration.

## Running the Application

### Start Main Hub

```bash
cd /Users/pranav/Projects/arc-ai
python3 main_hub/app.py
```

You should see:
```
INFO - Connected to MQTT broker
INFO - Subscribed to topic: arc/hub/requests/#
INFO - Starting FastAPI admin server on http://localhost:8000
```

### Test with Mini Hub Client

In another terminal:

```bash
cd /Users/pranav/Projects/arc-ai
python3 mini_hub/mini_hub.py [BROKER_IP]
```

Replace `[BROKER_IP]` with your Mac's IP address (or use `localhost` if testing on the same machine).

## API Endpoints

The Main Hub exposes a FastAPI admin interface on port 8000:

- `GET /health` - Check if service is running
- `GET /requests?limit=50` - View recent request history
- `GET /metrics` - Get service metrics (total requests, latency, success rate)

Example:
```bash
curl http://localhost:8000/health
curl http://localhost:8000/metrics
```

## Offline Network Setup

### Wi-Fi Hotspot

1. On your Mac: System Settings → General → Sharing → Internet Sharing
2. Enable "Internet Sharing" and select your connection method
3. Note the IP address shown (usually `192.168.2.1` or similar)
4. Connect Mini Hub laptop to this hotspot
5. Update `broker.host` in config.yaml to the Mac's IP

### Ethernet

1. Connect both laptops via Ethernet cable
2. Configure static IPs:
   - Main Hub (Mac): `192.168.1.1`
   - Mini Hub: `192.168.1.2`
3. Update `broker.host` in config.yaml to `192.168.1.1`

## Troubleshooting

### llama.cpp not found

- Make sure llama.cpp is built and in your PATH
- Or specify full path in `config.yaml`: `llama_cpp_path: /path/to/llama.cpp/llama-cli`
- Verify with: `llama-cli --version`

### Model file not found

- Check the path in `config.yaml` matches your actual model location
- Use absolute path: `/Users/yourname/main_hub/models/model.gguf`
- Verify file exists: `ls -lh ~/main_hub/models/model.gguf`

### MQTT connection failed

- Verify Mosquitto is running: `brew services list | grep mosquitto`
- Check broker host/port in config.yaml
- Test connection: `mosquitto_sub -h localhost -t test -v`

### LLM generation timeout

- Reduce `max_tokens` in config.yaml (try 128 or 64)
- Increase `llm_timeout` in config.yaml
- Use a smaller quantized model (Q4_K_M is recommended)

### Slow responses

- Reduce `max_tokens` to 128-256
- Use Q4_K_M or Q5_K_M quantization (not Q8)
- Increase `threads` if you have more CPU cores
- On Apple Silicon, Metal acceleration is automatic

## Project Structure

```
arc-ai/
├── main_hub/
│   ├── app.py              # Main application
│   ├── mqtt_client.py      # MQTT communication
│   ├── llm_adapter.py      # LLM integration
│   └── config.yaml         # Configuration
├── mini_hub/
│   └── mini_hub.py         # Test client
├── requirements.txt        # Python dependencies
└── README.md              # This file
```

## Request/Response Format

### Request (from Mini Hub)

```json
{
  "request_id": "uuid-v4",
  "mini_id": "mini-01",
  "timestamp": 1690000000,
  "payload": {
    "type": "query",
    "text": "User question here"
  }
}
```

### Response (to Mini Hub)

```json
{
  "request_id": "uuid-v4",
  "mini_id": "mini-01",
  "timestamp": 1690000000,
  "status": "ok",
  "result": {
    "text": "LLM reply",
    "tokens": 123
  }
}
```

Or on error:

```json
{
  "request_id": "uuid-v4",
  "mini_id": "mini-01",
  "timestamp": 1690000000,
  "status": "error",
  "error": {
    "code": "timeout",
    "message": "LLM generation timed out"
  }
}
```

## License

This project is provided as-is for offline AI communication.


