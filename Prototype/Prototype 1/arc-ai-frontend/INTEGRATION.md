# Integration Guide

## Connecting to Real Backend Services

### 1. Update Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_BASE=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws/updates
```

### 2. API Endpoint Mapping

The frontend expects the following endpoints:

#### Authentication
- `POST /api/auth/login` - Body: `{ email, password }` → Returns: `{ token, user }`
- `POST /api/auth/register` - Body: `{ name, email, password, org, role }` → Returns: `{ token, user }`

#### Status
- `GET /api/status/cluster` - Returns cluster health and metrics

#### Packets
- `GET /api/packets?limit=50&status=queued` - List packets with filters
- `GET /api/packets/:pktId` - Get packet details
- `POST /api/packets/retry` - Body: `{ pkt_id }` → Retry a failed packet

#### Query/Chat
- `POST /api/query` - Body: `{ question, context?, user_id? }` → Returns answer or 202 if queued

#### Capsules
- `GET /api/capsules` - List all capsules
- `GET /api/capsules/:capsuleId` - Get capsule details

### 3. WebSocket Events

The frontend listens for these WebSocket message types:

```javascript
{
  type: 'chat_stream',
  payload: {
    conversation_id: 'conv_123',
    chunk: 'text chunk',
    final: false,
    provenance: 'MainHub',
    capsule_id: 'cap_0a1b2c',
    confidence: 0.92
  }
}

{
  type: 'packet_update',
  payload: {
    pkt_id: 'pkt_20251208_0001',
    status: 'SENT',
    timestamp: '2025-12-08T04:13:00Z'
  }
}

{
  type: 'capsule_manifest',
  payload: {
    // Manifest data
  }
}
```

### 4. Authentication

All authenticated requests should include:
```
Authorization: Bearer <token>
```

### 5. Error Handling

The frontend expects error responses in this format:
```json
{
  "error": "Error message"
}
```

Status codes:
- 200: Success
- 202: Accepted (queued)
- 401: Unauthorized
- 404: Not Found
- 500: Server Error

### 6. CORS Configuration

Ensure your backend allows CORS from the frontend origin:
- Development: `http://localhost:5173`
- Production: Your production domain

### 7. Disabling MSW in Production

MSW is automatically disabled in production builds. For development, you can disable it by:

1. Commenting out the MSW import in `src/main.jsx`
2. Or setting `import.meta.env.DEV = false`

### 8. Testing Integration

1. Start your backend services
2. Update `.env` with correct URLs
3. Run `npm run dev`
4. Test authentication flow
5. Verify API calls in browser DevTools Network tab
6. Check WebSocket connection in DevTools

### 9. Deployment

For production:
1. Build: `npm run build`
2. Serve the `dist/` directory
3. Ensure environment variables are set correctly
4. Configure reverse proxy if needed for API/WebSocket


