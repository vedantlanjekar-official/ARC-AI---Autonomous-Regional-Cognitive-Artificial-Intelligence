"""
Simple MQTT Broker for Testing
This is a minimal MQTT broker implementation using hbmqtt
For production, use Mosquitto MQTT broker.
"""
import asyncio
import sys

try:
    from hbmqtt.broker import Broker
    HBMQTT_AVAILABLE = True
except ImportError:
    HBMQTT_AVAILABLE = False
    print("⚠️  hbmqtt not available. Please install it:")
    print("  pip install hbmqtt")
    print("Or install Mosquitto MQTT broker:")
    print("  Windows: Download from https://mosquitto.org/download/")
    sys.exit(1)

config = {
    'listeners': {
        'default': {
            'type': 'tcp',
            'bind': '0.0.0.0:1883',
        },
    },
    'sys_interval': 10,
    'auth': {
        'allow-anonymous': True,
    },
}

broker = Broker(config)

async def broker_coro():
    await broker.start()

if __name__ == '__main__':
    print("=" * 70)
    print("Simple MQTT Broker Starting")
    print("=" * 70)
    print("Listening on 0.0.0.0:1883")
    print("Press Ctrl+C to stop")
    print("=" * 70)
    
    try:
        loop = asyncio.get_event_loop()
        loop.run_until_complete(broker_coro())
        loop.run_forever()
    except KeyboardInterrupt:
        print("\n\nStopping broker...")
        loop.run_until_complete(broker.shutdown())
        print("Goodbye!")
    except Exception as e:
        print(f"\n❌ Error starting broker: {e}")
        print("Please install Mosquitto MQTT broker for better compatibility:")
        print("  Windows: Download from https://mosquitto.org/download/")
        sys.exit(1)

