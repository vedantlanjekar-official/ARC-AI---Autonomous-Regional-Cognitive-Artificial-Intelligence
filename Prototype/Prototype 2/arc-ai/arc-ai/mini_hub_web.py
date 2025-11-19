"""
Mini Hub with Web Interface - serves web app and connects to Main Hub via MQTT
Mobile browser → Mini Hub web server → Mini Hub MQTT → Main Hub
"""
import json
import time
import uuid
import logging
import paho.mqtt.client as mqtt
from typing import Optional
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading
import urllib.parse

logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger(__name__)


class MiniHubClient:
    """MQTT client for Main Hub"""
    
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
            self.client.connect(self.broker_host, self.broker_port, keepalive=60)
            self.client.loop_start()
            for _ in range(50):
                if self.client.is_connected():
                    break
                time.sleep(0.1)
            else:
                raise ConnectionError(f"Failed to connect to MQTT broker at {self.broker_host}:{self.broker_port}")
        except Exception as e:
            logger.error(f"Failed to connect: {e}")
            raise
    
    def _on_connect(self, client, userdata, flags, rc):
        """Callback when connected"""
        if rc == 0:
            topic = f"arc/hub/responses/{self.mini_id}"
            client.subscribe(topic, qos=1)
        else:
            logger.error(f"Connection failed, return code: {rc}")
    
    def _on_message(self, client, userdata, msg):
        """Callback when message is received"""
        try:
            payload = msg.payload.decode('utf-8')
            self.last_response = json.loads(payload)
            self.response_received = True
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
        
        self.response_received = False
        self.last_response = None
        
        topic = "arc/hub/requests/main"
        payload = json.dumps(request)
        
        result = self.client.publish(topic, payload, qos=1)
        if result.rc != mqtt.MQTT_ERR_SUCCESS:
            raise RuntimeError(f"Failed to publish request: {result.rc}")
        
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


# Global MQTT client
mqtt_client: Optional[MiniHubClient] = None


# HTML interface for mobile
HTML_INTERFACE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <title>AI Assistant</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            width: 100%;
            margin: 0 auto;
            flex: 1;
            display: flex;
            flex-direction: column;
        }
        .header {
            text-align: center;
            color: white;
            margin-bottom: 30px;
        }
        .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
        }
        .status {
            font-size: 14px;
            opacity: 0.9;
        }
        .chat-container {
            flex: 1;
            background: white;
            border-radius: 20px;
            padding: 20px;
            margin-bottom: 20px;
            overflow-y: auto;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .message {
            margin-bottom: 15px;
            animation: fadeIn 0.3s;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .user-message {
            text-align: right;
        }
        .user-message .bubble {
            background: #667eea;
            color: white;
            display: inline-block;
            padding: 12px 18px;
            border-radius: 18px 18px 4px 18px;
            max-width: 80%;
            word-wrap: break-word;
        }
        .assistant-message {
            text-align: left;
        }
        .assistant-message .bubble {
            background: #f0f0f0;
            color: #333;
            display: inline-block;
            padding: 12px 18px;
            border-radius: 18px 18px 18px 4px;
            max-width: 80%;
            word-wrap: break-word;
        }
        .thinking {
            text-align: center;
            color: #999;
            font-style: italic;
            padding: 20px;
        }
        .input-container {
            display: flex;
            gap: 10px;
            background: white;
            border-radius: 25px;
            padding: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        #questionInput {
            flex: 1;
            border: none;
            outline: none;
            padding: 12px 20px;
            font-size: 16px;
            border-radius: 20px;
        }
        #sendButton {
            background: #667eea;
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 20px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: background 0.3s;
        }
        #sendButton:hover {
            background: #5568d3;
        }
        #sendButton:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        .error {
            background: #ffebee;
            color: #c62828;
            padding: 12px;
            border-radius: 10px;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 AI Assistant</h1>
            <div class="status" id="status">Connected</div>
        </div>
        
        <div class="chat-container" id="chatContainer">
            <div class="message assistant-message">
                <div class="bubble">Hello! How can I help you today?</div>
            </div>
        </div>
        
        <div class="input-container">
            <input type="text" id="questionInput" placeholder="Ask me anything..." autocomplete="off">
            <button id="sendButton" onclick="sendQuestion()">Send</button>
        </div>
    </div>
    
    <script>
        const chatContainer = document.getElementById('chatContainer');
        const questionInput = document.getElementById('questionInput');
        const sendButton = document.getElementById('sendButton');
        const status = document.getElementById('status');
        
        questionInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !sendButton.disabled) {
                sendQuestion();
            }
        });
        
        function addMessage(text, isUser) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message ' + (isUser ? 'user-message' : 'assistant-message');
            
            const bubble = document.createElement('div');
            bubble.className = 'bubble';
            bubble.textContent = text;
            
            messageDiv.appendChild(bubble);
            chatContainer.appendChild(messageDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
        
        function showThinking() {
            const thinkingDiv = document.createElement('div');
            thinkingDiv.className = 'thinking';
            thinkingDiv.id = 'thinking';
            thinkingDiv.textContent = '🤔 Thinking...';
            chatContainer.appendChild(thinkingDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
        
        function hideThinking() {
            const thinking = document.getElementById('thinking');
            if (thinking) {
                thinking.remove();
            }
        }
        
        async function sendQuestion() {
            const question = questionInput.value.trim();
            if (!question || sendButton.disabled) return;
            
            addMessage(question, true);
            questionInput.value = '';
            sendButton.disabled = true;
            sendButton.textContent = 'Sending...';
            showThinking();
            
            try {
                const response = await fetch('/ask', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ question: question })
                });
                
                const data = await response.json();
                hideThinking();
                
                if (data.status === 'ok') {
                    addMessage(data.answer, false);
                    status.textContent = 'Connected';
                } else {
                    addMessage('❌ Error: ' + (data.error || 'Unknown error'), false);
                    status.textContent = 'Error';
                }
            } catch (error) {
                hideThinking();
                addMessage('❌ Connection error: ' + error.message, false);
                status.textContent = 'Disconnected';
            } finally {
                sendButton.disabled = false;
                sendButton.textContent = 'Send';
                questionInput.focus();
            }
        }
    </script>
</body>
</html>
"""


class WebHandler(BaseHTTPRequestHandler):
    """HTTP handler for web interface"""
    
    def do_GET(self):
        """Serve the HTML interface"""
        if self.path == '/' or self.path == '/index.html':
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(HTML_INTERFACE.encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_POST(self):
        """Handle API requests"""
        if self.path == '/ask':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
                question = data.get('question', '')
                
                if not question:
                    self.send_json_response({'status': 'error', 'error': 'No question provided'}, 400)
                    return
                
                # Send to Main Hub via MQTT
                if mqtt_client is None:
                    self.send_json_response({'status': 'error', 'error': 'MQTT client not connected'}, 500)
                    return
                
                try:
                    response = mqtt_client.send_request(question)
                    
                    if response.get("status") == "ok":
                        result = response.get("result", {})
                        answer = result.get("text", "No response received")
                        
                        # Clean up answer
                        if "Assistant:" in answer:
                            parts = answer.split("Assistant:", 1)
                            if len(parts) > 1:
                                answer = parts[1].strip()
                        
                        for marker in ["[end of text]", "<|endoftext|>", "</s>"]:
                            if marker in answer:
                                answer = answer.split(marker)[0].strip()
                        
                        self.send_json_response({
                            'status': 'ok',
                            'answer': answer,
                            'tokens': result.get('tokens', 0)
                        })
                    else:
                        error = response.get("error", {})
                        self.send_json_response({
                            'status': 'error',
                            'error': error.get('message', 'Unknown error')
                        })
                except TimeoutError as e:
                    self.send_json_response({'status': 'error', 'error': 'Request timed out'}, 408)
                except Exception as e:
                    self.send_json_response({'status': 'error', 'error': str(e)}, 500)
                    
            except json.JSONDecodeError:
                self.send_json_response({'status': 'error', 'error': 'Invalid JSON'}, 400)
        else:
            self.send_response(404)
            self.end_headers()
    
    def send_json_response(self, data, status_code=200):
        """Send JSON response"""
        self.send_response(status_code)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def log_message(self, format, *args):
        """Suppress default logging"""
        pass


def main():
    """Start web server and MQTT client"""
    import sys
    
    broker_host = sys.argv[1] if len(sys.argv) > 1 else "localhost"
    web_port = int(sys.argv[2]) if len(sys.argv) > 2 else 8080
    
    global mqtt_client
    
    print("=" * 70)
    print("Mini Hub Web Server")
    print("=" * 70)
    print(f"Connecting to Main Hub at {broker_host}...")
    
    # Connect MQTT client
    mqtt_client = MiniHubClient(broker_host=broker_host)
    try:
        mqtt_client.connect()
        print("✓ Connected to Main Hub via MQTT!")
    except Exception as e:
        print(f"❌ Failed to connect to Main Hub: {e}")
        sys.exit(1)
    
    # Start web server
    server = HTTPServer(('0.0.0.0', web_port), WebHandler)
    print(f"✓ Web server started on http://0.0.0.0:{web_port}")
    print(f"✓ Open this URL on your mobile device: http://<MINI_HUB_IP>:{web_port}")
    print("=" * 70)
    print("Press Ctrl+C to stop")
    print("=" * 70)
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n\nStopping server...")
        server.shutdown()
        if mqtt_client:
            mqtt_client.disconnect()
        print("Goodbye!")


if __name__ == "__main__":
    main()


