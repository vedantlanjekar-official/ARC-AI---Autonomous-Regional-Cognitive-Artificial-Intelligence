# ARC AI Mini Relay

Full-stack prototype showcasing authenticated packet relay:
`User A → mini_hub → main_hub → person_b → main_hub → mini_hub → User A`.

## Prerequisites
- Node.js 18 or later
- npm 9+ (bundled with Node 18)
- Bash shell (Git Bash on Windows is sufficient) to run `scripts/start.sh`

## Getting Started
1. Open a terminal in `arc-ai-mini/`.
2. Run the startup script (installs dependencies and launches all services plus the web UI):
   ```bash
   ./scripts/start.sh
   ```
3. Once the script finishes booting:
   - `mini_hub` (API + auth) → `http://localhost:3000`
   - `main_hub` (routing core) → `http://localhost:4000`
   - `person_b` (deterministic solver) → `http://localhost:5000`
   - Web UI (Vite dev server) → `http://localhost:5173`
4. Open the web UI in Chrome, sign up or sign in, compose a message, and watch the timeline update in real time.

Stop everything with `Ctrl+C` in the terminal that ran `start.sh`.

## Key Features
- **Hero + Auth Flow**: Landing page, professional sign-in/sign-up, and session-aware dashboard.
- **Secure Mini Hub**: JWT-authenticated API, bcrypt password hashing, SQLite-backed persistence, and timeline storage per packet.
- **Main Hub Core**: SQLite tracking of ingress/egress, persistence of hop-by-hop timeline, and resilient hand-off to `person_b`.
- **Person B Solver**: Deterministic reply engine with contextual timeline entries, plus optional OpenAI or Gemini integration for live answers.
- **Dashboard Insights**: Delivery statistics, live dispatch form with char counter, active timeline viewer, and historical packet table with drill-down.
- **Retry & Signature**: Mini hub retries failed routing attempts and adds a placeholder signature (`base64("signed:" + pkt_id)`).

## Manual Service Commands
If you prefer to run pieces individually:
```bash
npm install
npm run install:all

# In separate terminals
npm run start:person_b
npm run start:main_hub
npm run start:mini_hub
npm run start:web
```

## API Cheatsheet
All endpoints are hosted on `http://localhost:3000`.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/register` | POST | Create a new user (`{ "username", "password" }`). |
| `/auth/login` | POST | Retrieve JWT token + current delivery stats. |
| `/auth/profile` | GET | Return profile + stats (requires `Authorization: Bearer <token>`). |
| `/query` | POST | Dispatch a packet with `{ packet, client_timeline }`. Requires auth. |
| `/packets/recent` | GET | Authenticated fetch of last 10 packets + timelines. |
| `/packets/:pktId/timeline` | GET | Authenticated fetch of stored timeline for a packet. |

### Quick cURL Walkthrough
Register, log in, and send a packet entirely from the CLI.
```bash
# 1. Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"operator_a","password":"secret123"}'

# 2. Login (capture the token from the response)
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"operator_a","password":"secret123"}' | jq -r '.token')

# 3. Dispatch a packet
curl -X POST http://localhost:3000/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
        "packet": {
          "pkt_id": "pkt-demo-123",
          "dst": "person_b",
          "timestamp": "2025-11-13T12:00:00+05:30",
          "payload": "Hello, can you help?"
        },
        "client_timeline": [
          "web_ui: operator_a prepared pkt_id=pkt-demo-123"
        ]
      }'
```
Responses include the final `reply` plus the consolidated `timeline` for observability.

## AI Provider Integration (Optional)
Person B can call OpenAI or Gemini for richer answers. Configure by exporting environment variables before launching `npm run dev` (or in your shell profile):

```powershell
# PowerShell example for OpenAI
$env:LLM_PROVIDER = "openai"
$env:OPENAI_API_KEY = "<your-openai-api-key>"
$env:OPENAI_MODEL = "gpt-4o-mini"   # optional override
npm run dev
```

```bash
# Bash example for Gemini (supported models include gemini-1.5-flash-latest, gemini-1.5-flash-001, gemini-pro)
export LLM_PROVIDER=gemini
export GEMINI_API_KEY="<your-gemini-api-key>"
export GEMINI_MODEL="gemini-1.5-flash-latest"   # optional; falls back automatically if unavailable
npm run dev
```

If no provider is configured, Person B falls back to the deterministic reply logic. Timeline logs indicate whether an external model was consulted or if a fallback was used.

## Logging, Persistence & Database
- **SQLite**: `services/mini_hub/mini_hub.db` tracks users, packets, and timeline entries. `services/main_hub/main_hub.db` tracks routed packets and their timelines.
- **Storage Snapshots**: JSON append-only ledgers remain at `services/mini_hub/storage.json` and `services/main_hub/storage.json` for a human-readable audit trail.
- **Console Logs**: Each hop logs to stdout (mini hub, main hub, and person_b) in the sequence defined in the acceptance criteria.
- **Retry Skeleton**: Mini hub retries up to two additional times (500 ms backoff) when main hub returns a non-200 status.

## Project Structure
```
arc-ai-mini/
├── README.md
├── package.json          # Root scripts (install all, start via concurrently)
├── scripts/
│   └── start.sh          # Installs deps and launches all services + web UI
├── services/
│   ├── mini_hub/         # Auth + packet ingress, SQLite persistence, retry logic
│   ├── main_hub/         # Routing engine with SQLite timeline storage
│   └── person_b/         # Deterministic reply service
└── web/                  # Vite + React UI (hero, auth, dashboard, timelines)
```

## Flow Recap
1. Web UI authenticates the operator and posts a packet to `mini_hub /query` (with optional client timeline entries).
2. Mini hub registers the packet, stores timeline context, signs the payload, forwards to `main_hub`, and waits for the result with retries.
3. Main hub logs ingress, persists the packet, forwards to `person_b /receive`, captures the response timeline, and returns the combined events upstream.
4. Person B analyzes the payload, emits a deterministic reply, and returns its own timeline events.
5. Mini hub records the delivery, stores the full timeline, and returns the reply + events back to the UI. The dashboard updates stats and packet history automatically.

Everything runs locally on a single machine with rich observability of the packet path, authentication, and persistence layers.

