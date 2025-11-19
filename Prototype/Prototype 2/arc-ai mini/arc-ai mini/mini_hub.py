"""
Mini Hub Test Client - sends requests to Main Hub and receives responses
"""
import json
import os
import time
import uuid
import logging
import paho.mqtt.client as mqtt
from typing import Optional

try:
    import yaml
    YAML_AVAILABLE = True
except ImportError:
    YAML_AVAILABLE = False

logging.basicConfig(level=logging.WARNING)  # Reduce verbosity for interactive mode
logger = logging.getLogger(__name__)


class MiniHubClient:
    """Test client for Main Hub"""
    
    def __init__(self, broker_host: str = "localhost", broker_port: int = 1883, mini_id: str = "mini-01"):
        self.broker_host = broker_host
        self.broker_port = broker_port
        self.mini_id = mini_id
        self.client = None
        self.response_received = False
        self.last_response: Optional[dict] = None
        
    def connect(self):
        """Connect to MQTT broker"""
        self.client = mqtt.Client(client_id=self.mini_id)
        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message
        
        try:
            logger.debug(f"Connecting to MQTT broker at {self.broker_host}:{self.broker_port}")
            self.client.connect(self.broker_host, self.broker_port, keepalive=60)
            self.client.loop_start()
            # Wait up to 5 seconds for connection
            for _ in range(50):
                if self.client.is_connected():
                    break
                time.sleep(0.1)
            else:
                raise ConnectionError(f"Failed to connect to MQTT broker at {self.broker_host}:{self.broker_port} within 5 seconds")
        except Exception as e:
            logger.error(f"Failed to connect: {e}")
            raise
    
    def _on_connect(self, client, userdata, flags, rc):
        """Callback when connected"""
        if rc == 0:
            logger.debug("Connected to MQTT broker")
            # Subscribe to response topic
            topic = f"arc/hub/responses/{self.mini_id}"
            client.subscribe(topic, qos=1)
            logger.debug(f"Subscribed to response topic: {topic}")
        else:
            error_messages = {
                1: "Connection refused - incorrect protocol version",
                2: "Connection refused - invalid client identifier",
                3: "Connection refused - server unavailable",
                4: "Connection refused - bad username or password",
                5: "Connection refused - not authorised"
            }
            error_msg = error_messages.get(rc, f"Connection failed, return code: {rc}")
            logger.error(error_msg)
    
    def _on_message(self, client, userdata, msg):
        """Callback when message is received"""
        try:
            payload = msg.payload.decode('utf-8')
            self.last_response = json.loads(payload)
            self.response_received = True
            logger.debug(f"Received response: {self.last_response.get('status')}")
        except Exception as e:
            logger.error(f"Error processing response: {e}")
    
    def send_request(self, text: str, timeout: int = 90) -> dict:
        """Send a request and wait for response"""
        request_id = str(uuid.uuid4())
        
        request = {
            "request_id": request_id,
            "mini_id": self.mini_id,
            "timestamp": int(time.time()),
            "payload": {
                "type": "query",
                "text": text
            }
        }
        
        # Reset response flag
        self.response_received = False
        self.last_response = None
        
        # Publish request
        topic = "arc/hub/requests/main"
        payload = json.dumps(request)
        logger.debug(f"Sending request: {request_id}")
        
        result = self.client.publish(topic, payload, qos=1)
        if result.rc != mqtt.MQTT_ERR_SUCCESS:
            raise RuntimeError(f"Failed to publish request: {result.rc}")
        
        # Wait for response
        start_time = time.time()
        while not self.response_received:
            if time.time() - start_time > timeout:
                raise TimeoutError(f"No response received within {timeout}s")
            time.sleep(0.1)
        
        if self.last_response is None:
            raise RuntimeError("Response received but is None")
        
        return self.last_response
    
    def disconnect(self):
        """Disconnect from broker"""
        if self.client:
            self.client.loop_stop()
            self.client.disconnect()
            logger.debug("Disconnected from MQTT broker")


def load_config(config_path: Optional[str] = None) -> dict:
    """Load configuration from YAML file"""
    if config_path is None:
        # Look for config.yaml in the same directory as this script
        script_dir = os.path.dirname(os.path.abspath(__file__))
        config_path = os.path.join(script_dir, "config.yaml")
    
    if not os.path.exists(config_path):
        return {}
    
    if not YAML_AVAILABLE:
        logger.warning("PyYAML not installed. Install with: pip install pyyaml")
        return {}
    
    try:
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        logger.debug(f"Loaded configuration from {config_path}")
        return config
    except Exception as e:
        logger.warning(f"Failed to load config file: {e}")
        return {}


def main():
    """Interactive terminal for querying Main Hub"""
    import sys
    
    # Load config file
    config = load_config()
    broker_config = config.get("broker", {})
    mini_hub_config = config.get("mini_hub", {})
    connection_config = config.get("connection", {})
    
    # Get broker host from command line, config file, or use default
    broker_host = sys.argv[1] if len(sys.argv) > 1 else broker_config.get("host", "localhost")
    broker_port = broker_config.get("port", 1883)
    mini_id = mini_hub_config.get("id", "mini-01")
    timeout = connection_config.get("timeout", 90)
    
    print("=" * 70)
    print("Mini Hub - Interactive Terminal")
    print("=" * 70)
    print(f"Connecting to Main Hub at {broker_host}:{broker_port}...")
    
    client = MiniHubClient(broker_host=broker_host, broker_port=broker_port, mini_id=mini_id)
    
    try:
        client.connect()
        print("✓ Connected to Main Hub!")
        print("\nType your questions below. Type 'quit' or 'exit' to stop.")
        print("=" * 70)
        
        while True:
            try:
                # Get user input
                question = input("\nYou: ").strip()
                
                # Check for exit commands
                if question.lower() in ['quit', 'exit', 'q']:
                    print("\nGoodbye!")
                    break
                
                # Skip empty input
                if not question:
                    continue
                
                # Show thinking indicator
                print("🤔 Thinking...", end="", flush=True)
                
                # Send request and get response
                try:
                    response = client.send_request(question, timeout=timeout)
                    
                    # Clear thinking indicator
                    print("\r" + " " * 20 + "\r", end="")
                    
                    if response.get("status") == "ok":
                        result = response.get("result", {})
                        answer = result.get("text", "No response received")
                        
                        # Clean up the answer (remove prompt artifacts if present)
                        if "Assistant:" in answer:
                            parts = answer.split("Assistant:", 1)
                            if len(parts) > 1:
                                answer = parts[1].strip()
                        
                        # Remove end markers
                        for marker in ["[end of text]", "<|endoftext|>", "</s>"]:
                            if marker in answer:
                                answer = answer.split(marker)[0].strip()
                        
                        print(f"Assistant: {answer}")
                        tokens = result.get("tokens", 0)
                        if tokens > 0:
                            print(f"          (Tokens: {tokens})")
                    else:
                        error = response.get("error", {})
                        print(f"❌ Error: {error.get('code', 'unknown')} - {error.get('message', 'Unknown error')}")
                
                except TimeoutError as e:
                    print("\r" + " " * 20 + "\r", end="")
                    print(f"❌ Timeout: {e}")
                except Exception as e:
                    print("\r" + " " * 20 + "\r", end="")
                    print(f"❌ Error: {e}")
            
            except KeyboardInterrupt:
                print("\n\nInterrupted. Type 'quit' to exit or continue asking questions.")
            except EOFError:
                print("\n\nGoodbye!")
                break
        
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
    except Exception as e:
        print(f"\n❌ Connection error: {e}")
        logger.error(f"Error: {e}")
    finally:
        client.disconnect()
        print("\nDisconnected from Main Hub.")


if __name__ == "__main__":
    main()

