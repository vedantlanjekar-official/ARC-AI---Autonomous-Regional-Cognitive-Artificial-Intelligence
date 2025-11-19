# Mini Hub - Client for Main Arc

A lightweight client that connects to the Main Hub (Main Arc) via MQTT to send queries and receive AI responses.

## Features

- ✅ **MQTT Communication** - Connects to Main Hub via Mosquitto MQTT broker
- ✅ **Interactive Terminal** - Simple command-line interface for asking questions
- ✅ **Configurable** - Easy configuration via `config.yaml`
- ✅ **Connection Testing** - Built-in test script to verify connectivity

## Prerequisites

- Python 3.11+
- MQTT broker running (Mosquitto) - usually on the Main Hub machine
- Main Hub running and accessible

## Installation

### 1. Install Python Dependencies

```bash
pip3 install -r requirements.txt
```

This installs:
- `paho-mqtt` - MQTT client library
- `pyyaml` - Configuration file support

### 2. Configure Connection

Edit `config.yaml` to set the Main Hub's broker address:

```yaml
broker:
  host: localhost  # Use 'localhost' if Main Hub is on same machine
                   # Use IP address (e.g., 192.168.1.6) if connecting over network
  port: 1883

mini_hub:
  id: mini-01  # Unique identifier for this Mini Hub

connection:
  timeout: 90  # Seconds to wait for response
```

**Important**: 
- If Main Hub is on the same machine, use `localhost`
- If Main Hub is on a different machine, use the Main Hub's IP address
- Find the Main Hub's IP: `ifconfig | grep "inet " | grep -v 127.0.0.1`

## Usage

### Test Connection First

Before using the interactive terminal, test the connection:

```bash
python3 test_connection.py [BROKER_IP]
```

Replace `[BROKER_IP]` with your Main Hub's IP (or omit for `localhost`).

This will:
1. Connect to the MQTT broker
2. Send a test message
3. Verify response from Main Hub

### Run Interactive Terminal

```bash
python3 mini_hub.py [BROKER_IP]
```

Replace `[BROKER_IP]` with your Main Hub's IP (or omit to use `config.yaml` settings).

Example:
```bash
# Connect to local Main Hub
python3 mini_hub.py

# Connect to remote Main Hub
python3 mini_hub.py 192.168.1.6
```

### Using the Terminal

Once connected, you'll see:
```
======================================================================
Mini Hub - Interactive Terminal
======================================================================
Connecting to Main Hub at localhost:1883...
✓ Connected to Main Hub!

Type your questions below. Type 'quit' or 'exit' to stop.
======================================================================

You: 
```

Simply type your questions and press Enter. The Mini Hub will:
1. Send your question to the Main Hub
2. Wait for the AI response
3. Display the answer

Type `quit`, `exit`, or `q` to disconnect.

## Connecting to Main Arc

### Same Machine (Local)

If Main Hub is running on the same machine:

1. Make sure Main Hub is running:
   ```bash
   cd /Users/pranav/Projects/arc-ai
   python3 main_hub/main_hub.py
   ```

2. Make sure Mosquitto is running:
   ```bash
   brew services list | grep mosquitto
   ```

3. Run Mini Hub:
   ```bash
   cd /Users/pranav/Projects/arc-ai\ mini
   python3 mini_hub.py
   ```

### Different Machines (Network)

If Main Hub is on a different machine:

1. **Find Main Hub's IP address** (on the Main Hub machine):
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

2. **Update Mini Hub config** (`config.yaml`):
   ```yaml
   broker:
     host: 192.168.1.6  # Replace with Main Hub's IP
     port: 1883
   ```

3. **Make sure Main Hub's MQTT broker is accessible**:
   - Main Hub's `config.yaml` should have `broker.host: 0.0.0.0` (not `localhost`)
   - Firewall should allow port 1883

4. **Run Mini Hub**:
   ```bash
   python3 mini_hub.py 192.168.1.6
   ```

## Troubleshooting

### Connection Failed

**Error**: `Failed to connect to MQTT broker`

**Solutions**:
1. Verify Mosquitto is running on Main Hub:
   ```bash
   brew services list | grep mosquitto
   ```

2. Check if Main Hub is running:
   ```bash
   # On Main Hub machine
   cd /Users/pranav/Projects/arc-ai
   python3 main_hub/main_hub.py
   ```

3. Verify broker host/port in `config.yaml`

4. Test MQTT connection manually:
   ```bash
   mosquitto_sub -h [BROKER_IP] -t test -v
   ```

### Timeout Errors

**Error**: `No response received within 90s`

**Solutions**:
1. Check if Main Hub is processing requests (check Main Hub console)
2. Verify Ollama is running on Main Hub:
   ```bash
   ollama list
   ```
3. Increase timeout in `config.yaml`:
   ```yaml
   connection:
     timeout: 120  # Increase to 120 seconds
   ```

### Wrong IP Address

If you're connecting over network and getting connection errors:

1. Find the correct IP on Main Hub machine:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

2. Update `config.yaml` with the correct IP

3. Make sure both machines are on the same network

## Project Structure

```
arc-ai mini/
├── mini_hub.py          # Main client application
├── test_connection.py   # Connection test script
├── config.yaml          # Configuration file
├── requirements.txt     # Python dependencies
└── README.md           # This file
```

## How It Works

1. **Mini Hub** connects to MQTT broker (usually on Main Hub machine)
2. **Mini Hub** subscribes to response topic: `arc/hub/responses/{mini_id}`
3. **Mini Hub** publishes requests to: `arc/hub/requests/main`
4. **Main Hub** receives request, processes with LLM, and publishes response
5. **Mini Hub** receives response and displays it to user

## Request/Response Format

### Request (Mini Hub → Main Hub)

```json
{
  "request_id": "uuid-v4",
  "mini_id": "mini-01",
  "timestamp": 1690000000,
  "payload": {
    "type": "query",
    "text": "What is the capital of France?"
  }
}
```

### Response (Main Hub → Mini Hub)

```json
{
  "request_id": "uuid-v4",
  "mini_id": "mini-01",
  "timestamp": 1690000000,
  "status": "ok",
  "result": {
    "text": "The capital of France is Paris.",
    "tokens": 8
  }
}
```

## License

This project is provided as-is for connecting to Main Arc.
