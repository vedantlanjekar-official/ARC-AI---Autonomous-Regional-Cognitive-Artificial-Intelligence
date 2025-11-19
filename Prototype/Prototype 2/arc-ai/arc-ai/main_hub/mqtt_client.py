"""
MQTT Client for Main Hub - handles communication with Mini Hub
"""
import json
import logging
from typing import Callable, Optional
import paho.mqtt.client as mqtt
from datetime import datetime

logger = logging.getLogger(__name__)


class MQTTClient:
    """Handles MQTT connection, subscription, and publishing"""
    
    def __init__(self, host: str, port: int = 1883, qos: int = 1):
        self.host = host
        self.port = port
        self.qos = qos
        self.client = None
        self.on_message_callback: Optional[Callable] = None
        self.connected = False
        
    def connect(self):
        """Connect to MQTT broker"""
        self.client = mqtt.Client(client_id="main_hub")
        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message
        self.client.on_disconnect = self._on_disconnect
        
        try:
            logger.info(f"Connecting to MQTT broker at {self.host}:{self.port}")
            self.client.connect(self.host, self.port, keepalive=60)
            self.client.loop_start()
        except Exception as e:
            logger.error(f"Failed to connect to MQTT broker: {e}")
            raise
    
    def _on_connect(self, client, userdata, flags, rc):
        """Callback when connected to broker"""
        if rc == 0:
            self.connected = True
            logger.info("Connected to MQTT broker")
            # Subscribe to all request topics
            topic = "arc/hub/requests/#"
            client.subscribe(topic, qos=self.qos)
            logger.info(f"Subscribed to topic: {topic}")
        else:
            logger.error(f"Failed to connect to broker, return code: {rc}")
            self.connected = False
    
    def _on_message(self, client, userdata, msg):
        """Callback when message is received"""
        try:
            topic = msg.topic
            payload = msg.payload.decode('utf-8')
            logger.info(f"Received message on topic: {topic}")
            logger.debug(f"Message payload: {payload}")
            
            if self.on_message_callback:
                self.on_message_callback(topic, payload)
        except Exception as e:
            logger.error(f"Error processing MQTT message: {e}")
    
    def _on_disconnect(self, client, userdata, rc):
        """Callback when disconnected from broker"""
        self.connected = False
        logger.warning(f"Disconnected from MQTT broker (rc={rc})")
    
    def set_message_callback(self, callback: Callable):
        """Set callback function for incoming messages"""
        self.on_message_callback = callback
    
    def publish_response(self, mini_id: str, response_data: dict):
        """Publish response to Mini Hub"""
        topic = f"arc/hub/responses/{mini_id}"
        try:
            payload = json.dumps(response_data)
            result = self.client.publish(topic, payload, qos=self.qos)
            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                logger.info(f"Published response to {topic}")
            else:
                logger.error(f"Failed to publish to {topic}, return code: {result.rc}")
        except Exception as e:
            logger.error(f"Error publishing response: {e}")
    
    def disconnect(self):
        """Disconnect from MQTT broker"""
        if self.client:
            self.client.loop_stop()
            self.client.disconnect()
            logger.info("Disconnected from MQTT broker")

