"""
Quick test to verify connection to Main Hub
"""
from mini_hub import MiniHubClient
import sys

def main():
    # Load config or use command line
    broker_host = sys.argv[1] if len(sys.argv) > 1 else "localhost"
    
    print("=" * 70)
    print("Connecting to Main Hub...")
    print("=" * 70)
    
    client = MiniHubClient(broker_host=broker_host)
    
    try:
        client.connect()
        print("✓ Connected to Main Hub!")
        print()
        
        # Send a test question
        test_question = "Hello! Can you confirm you're connected?"
        print(f"Sending: {test_question}")
        print()
        
        response = client.send_request(test_question, timeout=30)
        
        if response.get("status") == "ok":
            answer = response.get("result", {}).get("text", "")
            tokens = response.get("result", {}).get("tokens", 0)
            
            print("Response from Main Hub:")
            print("-" * 70)
            print(answer)
            print("-" * 70)
            print(f"Tokens: {tokens}")
            print()
            print("✅ Connection successful! You can now use mini_hub.py interactively.")
        else:
            error = response.get("error", {})
            print(f"❌ Error: {error.get('code')} - {error.get('message')}")
            
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return 1
    finally:
        client.disconnect()
        print("Disconnected.")
        print("=" * 70)
    
    return 0

if __name__ == "__main__":
    sys.exit(main())

