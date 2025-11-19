"""
Main Hub Application - MQTT + LLM + FastAPI Admin
"""
import json
import logging
import os
import signal
import sys
import time
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from collections import deque

import yaml
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
import uvicorn

from mqtt_client import MQTTClient
from llm_adapters import OllamaAdapter
import threading

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global state
mqtt_client: Optional[MQTTClient] = None
llm_adapter = None
system_prompt = ""
request_history = deque(maxlen=200)  # Keep last 200 requests
metrics = {
    "total_requests": 0,
    "successful_requests": 0,
    "failed_requests": 0,
    "total_latency_ms": 0.0
}

# FastAPI app
app = FastAPI(title="Main Hub API", version="1.0.0")


def load_config(config_path: Optional[str] = None) -> dict:
    """Load configuration from YAML file"""
    if config_path is None:
        # Look for config.yaml in the same directory as this script
        script_dir = os.path.dirname(os.path.abspath(__file__))
        config_path = os.path.join(script_dir, "config.yaml")
    
    try:
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        logger.info(f"Loaded configuration from {config_path}")
        return config
    except FileNotFoundError:
        logger.error(f"Config file not found: {config_path}")
        raise
    except yaml.YAMLError as e:
        logger.error(f"Error parsing config file: {e}")
        raise


def initialize_llm_adapter(config: dict):
    """Initialize Ollama LLM adapter"""
    global llm_adapter
    
    ollama_config = config.get("ollama", {})
    timeout = config.get("timeouts", {}).get("llm_timeout", 300)
    
    llm_adapter = OllamaAdapter(
        base_url=ollama_config.get("base_url", "http://localhost:11434"),
        model=ollama_config.get("model", "mistral:7b"),
        timeout=timeout,
        max_retries=ollama_config.get("max_retries", 3),
        retry_delay=ollama_config.get("retry_delay", 1.0)
    )
    logger.info(f"Initialized OllamaAdapter - Model: {ollama_config.get('model', 'mistral:7b')}, URL: {ollama_config.get('base_url', 'http://localhost:11434')}")


def validate_request(data: dict) -> tuple[bool, Optional[str]]:
    """Validate incoming request JSON"""
    required_fields = ["request_id", "mini_id", "timestamp", "payload"]
    
    for field in required_fields:
        if field not in data:
            return False, f"Missing required field: {field}"
    
    if "type" not in data["payload"] or "text" not in data["payload"]:
        return False, "Payload must contain 'type' and 'text'"
    
    return True, None


def handle_mqtt_message(topic: str, payload: str):
    """
    Handle incoming MQTT message (runs in background thread)
    This function is called by MQTT client when a message arrives
    """
    # Process in background thread to avoid blocking MQTT loop
    thread = threading.Thread(
        target=_process_request,
        args=(topic, payload),
        daemon=True
    )
    thread.start()


def _process_request(topic: str, payload: str):
    """Process request in background thread"""
    start_time = time.time()
    
    try:
        # Parse JSON
        request_data = json.loads(payload)
        request_id = request_data.get('request_id', 'unknown')
        mini_id = request_data.get('mini_id', 'unknown')
        
        # Console output for new message
        print(f"\n{'='*70}")
        print(f"📨 NEW MESSAGE RECEIVED")
        print(f"{'='*70}")
        print(f"Request ID: {request_id}")
        print(f"Mini Hub ID: {mini_id}")
        print(f"Topic: {topic}")
        print(f"Timestamp: {datetime.fromtimestamp(request_data.get('timestamp', time.time()))}")
        logger.info(f"Received request: {request_id} from {mini_id}")
        
        # Validate
        is_valid, error_msg = validate_request(request_data)
        if not is_valid:
            logger.error(f"Invalid request: {error_msg}")
            send_error_response(
                request_data.get("mini_id", "unknown"),
                request_data.get("request_id", str(uuid.uuid4())),
                "validation_error",
                error_msg
            )
            return
        
        request_id = request_data["request_id"]
        mini_id = request_data["mini_id"]
        user_text = request_data["payload"]["text"]
        
        # Build prompt
        full_prompt = f"{system_prompt}\n\nUser: {user_text}\nAssistant:"
        
        # Log prompt info
        prompt_length = len(full_prompt)
        user_text_length = len(user_text)
        logger.info(f"Processing request with prompt length: {prompt_length} chars (user text: {user_text_length} chars)")
        
        # Calculate dynamic timeout based on prompt length
        # Base timeout from adapter, add 1s per 100 chars of prompt (up to base timeout)
        base_timeout = llm_adapter.timeout
        dynamic_timeout = min(base_timeout, max(60, 60 + (prompt_length // 100)))
        logger.info(f"Using timeout: {dynamic_timeout}s for this request (base: {base_timeout}s)")
        
        # Temporarily adjust adapter timeout for this request
        original_timeout = llm_adapter.timeout
        llm_adapter.timeout = dynamic_timeout
        
        # Generate response
        print(f"\n🤔 Processing request...")
        print(f"   User question: {user_text[:100]}{'...' if len(user_text) > 100 else ''}")
        print(f"   Calling Ollama API...")
        
        try:
            result = llm_adapter.generate(full_prompt)
            
            # Restore original timeout
            llm_adapter.timeout = original_timeout
            
            # Build response
            response = {
                "request_id": request_id,
                "mini_id": mini_id,
                "timestamp": int(time.time()),
                "status": "ok",
                "result": {
                    "text": result["text"],
                    "tokens": result["tokens"]
                }
            }
            
            # Publish response
            mqtt_client.publish_response(mini_id, response)
            
            # Update metrics
            latency_ms = (time.time() - start_time) * 1000
            metrics["total_requests"] += 1
            metrics["successful_requests"] += 1
            metrics["total_latency_ms"] += latency_ms
            
            # Store in history
            request_history.append({
                "request_id": request_id,
                "mini_id": mini_id,
                "timestamp": request_data.get("timestamp"),
                "status": "ok",
                "latency_ms": latency_ms,
                "user_text": user_text[:100],  # Truncate for storage
                "response_text": result["text"][:100]
            })
            
            # Console output for successful response
            print(f"\n✅ REPLY SENT BACK TO MINI HUB")
            print(f"{'='*70}")
            print(f"Request ID: {request_id}")
            print(f"Response length: {len(result['text'])} chars")
            print(f"Tokens generated: {result['tokens']}")
            print(f"Processing time: {latency_ms:.2f}ms")
            print(f"Response preview: {result['text'][:150]}{'...' if len(result['text']) > 150 else ''}")
            print(f"{'='*70}\n")
            
            logger.info(f"Successfully processed request {request_id} in {latency_ms:.2f}ms")
            
        except TimeoutError as e:
            # Restore original timeout
            llm_adapter.timeout = original_timeout
            logger.error(f"LLM timeout after {dynamic_timeout}s: {e}")
            logger.error(f"Request length: {user_text_length} chars, Prompt length: {prompt_length} chars")
            
            print(f"\n❌ ERROR: Request timed out after {dynamic_timeout}s")
            print(f"{'='*70}\n")
            
            send_error_response(mini_id, request_id, "timeout", f"Request took too long ({dynamic_timeout}s). The question may be too complex. Please try breaking it into smaller parts or rephrasing.")
            metrics["total_requests"] += 1
            metrics["failed_requests"] += 1
            
        except Exception as e:
            # Restore original timeout
            llm_adapter.timeout = original_timeout
            error_msg = str(e)
            logger.error(f"LLM error: {error_msg}")
            logger.error(f"Request length: {user_text_length} chars, Prompt length: {prompt_length} chars")
            logger.error(f"Error type: {type(e).__name__}")
            
            # Provide user-friendly error message
            if "timeout" in error_msg.lower():
                user_friendly_msg = "The request took too long. Try asking a simpler question."
            elif "connection" in error_msg.lower() or "refused" in error_msg.lower():
                user_friendly_msg = "Cannot connect to Ollama. Make sure Ollama is running."
            else:
                user_friendly_msg = f"Error processing request: {error_msg[:200]}"
            
            print(f"\n❌ ERROR: {user_friendly_msg}")
            print(f"{'='*70}\n")
            
            send_error_response(mini_id, request_id, "llm_error", user_friendly_msg)
            metrics["total_requests"] += 1
            metrics["failed_requests"] += 1
            
    except json.JSONDecodeError as e:
        error_msg = f"Invalid JSON in message: {e}"
        logger.error(error_msg)
        print(f"\n❌ ERROR: {error_msg}")
        print(f"{'='*70}\n")
    except Exception as e:
        error_msg = f"Error handling message: {e}"
        logger.error(error_msg)
        print(f"\n❌ ERROR: {error_msg}")
        print(f"{'='*70}\n")


def send_error_response(mini_id: str, request_id: str, error_code: str, error_message: str):
    """Send error response to Mini Hub"""
    response = {
        "request_id": request_id,
        "mini_id": mini_id,
        "timestamp": int(time.time()),
        "status": "error",
        "error": {
            "code": error_code,
            "message": error_message
        }
    }
    mqtt_client.publish_response(mini_id, response)


# FastAPI endpoints
@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok", "mqtt_connected": mqtt_client.connected if mqtt_client else False}


@app.get("/requests")
async def get_requests(limit: int = 50):
    """Get recent request history"""
    return {
        "count": len(request_history),
        "requests": list(request_history)[-limit:]
    }


@app.get("/metrics")
async def get_metrics():
    """Get service metrics"""
    avg_latency = (
        metrics["total_latency_ms"] / metrics["successful_requests"]
        if metrics["successful_requests"] > 0
        else 0.0
    )
    
    return {
        "total_requests": metrics["total_requests"],
        "successful_requests": metrics["successful_requests"],
        "failed_requests": metrics["failed_requests"],
        "average_latency_ms": round(avg_latency, 2),
        "success_rate": (
            metrics["successful_requests"] / metrics["total_requests"] * 100
            if metrics["total_requests"] > 0
            else 0.0
        )
    }


def signal_handler(sig, frame):
    """Handle shutdown signals"""
    logger.info("Shutting down...")
    if mqtt_client:
        mqtt_client.disconnect()
    sys.exit(0)


def main():
    """Main entry point"""
    global mqtt_client, system_prompt
    
    print("\n" + "="*70)
    print("🚀 MAIN HUB STARTING")
    print("="*70)
    
    # Load config
    print("📋 Loading configuration...")
    config = load_config()
    
    # Set system prompt
    system_prompt = config.get("system_prompt", "You are a concise AI assistant. Reply briefly and clearly.")
    print(f"✅ Configuration loaded")
    
    # Initialize LLM adapter
    print("🤖 Initializing Ollama LLM adapter...")
    initialize_llm_adapter(config)
    ollama_config = config.get("ollama", {})
    print(f"✅ Connected to Ollama - Model: {ollama_config.get('model', 'mistral:7b')}")
    
    # Initialize MQTT client
    print("📡 Initializing MQTT client...")
    broker_config = config.get("broker", {})
    mqtt_client = MQTTClient(
        host=broker_config.get("host", "localhost"),
        port=broker_config.get("port", 1883),
        qos=config.get("timeouts", {}).get("mqtt_qos", 1)
    )
    
    # Set message callback
    mqtt_client.set_message_callback(handle_mqtt_message)
    
    # Connect to MQTT
    try:
        mqtt_client.connect()
        print(f"✅ Connected to MQTT broker at {broker_config.get('host', 'localhost')}:{broker_config.get('port', 1883)}")
        print(f"✅ Subscribed to topic: arc/hub/requests/#")
    except Exception as e:
        logger.error(f"Failed to start MQTT client: {e}")
        print(f"\n❌ ERROR: Failed to connect to MQTT broker: {e}")
        sys.exit(1)
    
    # Register signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Start FastAPI server
    print("🌐 Starting FastAPI admin server...")
    print("="*70)
    print("✅ MAIN HUB IS RUNNING")
    print("="*70)
    print("📊 Admin API: http://localhost:8000")
    print("   - Health: http://localhost:8000/health")
    print("   - Requests: http://localhost:8000/requests")
    print("   - Metrics: http://localhost:8000/metrics")
    print("="*70)
    print("📨 Waiting for messages on topic: arc/hub/requests/#")
    print("💬 Ready to process requests from Mini Hub...")
    print("="*70 + "\n")
    
    logger.info("Starting FastAPI admin server on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")


if __name__ == "__main__":
    main()

