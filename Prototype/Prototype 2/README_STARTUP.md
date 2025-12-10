# ARC AI Project - Startup Guide

## Project Overview

This project consists of three main components:

1. **Main Hub** (Python FastAPI) - Port 8000
   - Receives requests via MQTT
   - Processes with Ollama LLM
   - Sends responses back via MQTT

2. **Mini Hub** (Python HTTP Server) - Port 8080
   - Web interface for chat
   - Connects to Main Hub via MQTT
   - Serves HTML interface

3. **Next.js App** (React/Next.js) - Port 3000
   - Modern web frontend
   - Connects to Mini Hub web server

## Prerequisites

### Required Services

1. **MQTT Broker (Mosquitto)**
   - Download from: https://mosquitto.org/download/
   - Or use Chocolatey: `choco install mosquitto`
   - Start service: `net start mosquitto`
   - Or run manually: `mosquitto -c mosquitto.conf`

2. **Ollama LLM**
   - Download from: https://ollama.ai/download
   - Install and start Ollama service
   - Pull a model: `ollama pull mistral:7b`

## Quick Start

### Option 1: Use the Startup Script

```powershell
.\start_project.ps1
```

### Option 2: Manual Start

1. **Start MQTT Broker** (if not running as service):
   ```powershell
   mosquitto -c mosquitto.conf
   ```

2. **Start Main Hub**:
   ```powershell
   cd "arc-ai\arc-ai\main_hub"
   python main_hub.py
   ```

3. **Start Mini Hub**:
   ```powershell
   cd "arc-ai mini\arc-ai mini"
   python mini_hub_web.py
   ```

4. **Start Next.js App**:
   ```powershell
   cd "arc-ai app\arc-ai app"
   npm run dev
   ```

5. **Open Browser**:
   - Navigate to: http://localhost:3000
   - Configure Mini Hub URL: http://localhost:8080

## Configuration

### Main Hub Config
Edit `arc-ai\arc-ai\main_hub\config.yaml`:
- `broker.host`: MQTT broker address (default: localhost)
- `ollama.base_url`: Ollama API URL (default: http://localhost:11434)
- `ollama.model`: Model name (default: mistral:7b)

### Mini Hub Config
Edit `arc-ai mini\arc-ai mini\config.yaml`:
- `broker.host`: Main Hub's MQTT broker address
- `web.port`: Web server port (default: 8080)

### Next.js App
- Configure Mini Hub URL in the app settings (http://localhost:8080)

## Service URLs

- **Main Hub API**: http://localhost:8000
  - Health: http://localhost:8000/health
  - Metrics: http://localhost:8000/metrics
  - Requests: http://localhost:8000/requests

- **Mini Hub Web**: http://localhost:8080

- **Next.js App**: http://localhost:3000

## Troubleshooting

### MQTT Connection Failed
- Verify Mosquitto is running: `Test-NetConnection localhost -Port 1883`
- Check firewall settings
- Verify broker host in config files

### Ollama Connection Failed
- Verify Ollama is running: `Test-NetConnection localhost -Port 11434`
- Check if model is downloaded: `ollama list`
- Pull model if needed: `ollama pull mistral:7b`

### Services Not Starting
- Check if ports are already in use
- Verify Python dependencies: `pip install -r requirements.txt`
- Verify Node.js dependencies: `npm install`

## Architecture

```
User Browser (Chrome)
    ↓
Next.js App (port 3000)
    ↓ HTTP
Mini Hub Web Server (port 8080)
    ↓ MQTT
MQTT Broker (port 1883)
    ↓ MQTT
Main Hub (port 8000)
    ↓ HTTP
Ollama LLM (port 11434)
```

## Notes

- All services must be running for full functionality
- MQTT broker is essential for communication between Mini Hub and Main Hub
- Ollama is required for LLM processing
- The Next.js app needs to be configured with the Mini Hub URL




