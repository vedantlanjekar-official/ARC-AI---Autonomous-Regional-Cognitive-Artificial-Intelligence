import { http, HttpResponse } from 'msw';

// Mock data
const users = [
  {
    id: 'user_01',
    name: 'Anita Sharma',
    email: 'anita@org.example',
    org: 'MeshHealth',
    role: 'admin',
    avatar_url: 'https://example.com/avatars/anita.png',
  },
  {
    id: 'user_02',
    name: 'Ravi Kumar',
    email: 'ravi@org.example',
    org: 'AgriMesh',
    role: 'operator',
    avatar_url: 'https://example.com/avatars/ravi.png',
  },
  {
    id: 'user_03',
    name: 'Local User',
    email: 'local@device',
    org: 'EdgeNode',
    role: 'user',
    avatar_url: null,
  },
  {
    id: 'demo_user',
    name: 'Demo User',
    email: 'demo@arc-ai.example',
    org: 'ARC-AI Demo',
    role: 'admin',
    avatar_url: null,
  },
];

const clusterStatus = {
  cluster_name: 'ARC-AI-West-1',
  node_status: 'DEGRADED',
  last_manifest_time: '2025-12-07T22:11:05Z',
  cache_hit_rate: 0.823,
  queued_packets: 12,
  active_mini_hubs: 5,
  last_sync: '2025-12-08T09:45:00Z',
  version: 'v1.4.2',
  notes: 'One mini-hub (mH-chi-03) delayed sync due to intermittent link',
};

const packets = [
  {
    pkt_id: 'pkt_20251208_0001',
    timestamp: '2025-12-08T04:12:10Z',
    src: 'mH-chi-01',
    dst: 'MH-west-1',
    type: 'QUERY',
    size_bytes: 512,
    status: 'QUEUED',
    q_hash: 'sha256:ab12cd34ef56...',
    emb_hint: [0.12, -0.04, 0.003],
    signature_verified: false,
  },
  {
    pkt_id: 'pkt_20251207_1532',
    timestamp: '2025-12-07T15:32:00Z',
    src: 'mH-del-02',
    dst: 'MH-west-1',
    type: 'RESPONSE',
    size_bytes: 2048,
    status: 'ACKED',
    q_hash: 'sha256:c0ffee...',
    emb_hint: [0.21, 0.11, -0.07],
    signature_verified: true,
  },
  {
    pkt_id: 'pkt_20251208_0015',
    timestamp: '2025-12-08T05:00:45Z',
    src: 'mH-chi-03',
    dst: 'MH-west-1',
    type: 'CAPSULE',
    size_bytes: 10240,
    status: 'FAILED',
    q_hash: 'sha256:deadbeef...',
    emb_hint: [],
    signature_verified: false,
  },
];

const capsules = [
  {
    capsule_id: 'cap_0a1b2c',
    title: 'Soil Moisture → Irrigation Rule',
    question_hash: 'sha256:ab12cd34ef56...',
    author: 'MH-west-1',
    signed_at: '2025-11-30T10:00:00Z',
    ttl_days: 90,
    signature_ok: true,
    provenance_summary: 'Validated rule derived from regional agronomists',
  },
  {
    capsule_id: 'cap_9f8e7d',
    title: 'Basic First Aid FAQ',
    question_hash: 'sha256:beefcafe1234...',
    author: 'MH-east-2',
    signed_at: '2025-12-02T06:21:00Z',
    ttl_days: 180,
    signature_ok: true,
  },
];

export const handlers = [
  // Auth endpoints
  http.post('/api/auth/login', async ({ request }) => {
    try {
      const { email, password } = await request.json();
      const user = users.find((u) => u.email === email);
      
      // Allow demo account or any user with password 'password'
      if (user && password === 'password') {
        return HttpResponse.json({
          token: 'eyJhbGci...mock-jwt',
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        });
      }
      
      return HttpResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    } catch (error) {
      console.error('Login handler error:', error);
      return HttpResponse.json(
        { error: 'Login failed. Please try again.' },
        { status: 500 }
      );
    }
  }),

  http.post('/api/auth/register', async ({ request }) => {
    try {
      const data = await request.json();
      
      // Validate required fields
      if (!data.name || !data.email || !data.password || !data.role) {
        return HttpResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        );
      }

      // Check if user already exists
      const existingUser = users.find((u) => u.email === data.email);
      if (existingUser) {
        return HttpResponse.json(
          { error: 'User with this email already exists' },
          { status: 409 }
        );
      }

      const newUser = {
        id: `user_${Date.now()}`,
        name: data.name,
        email: data.email,
        org: data.org || '',
        role: data.role || 'user',
        avatar_url: null,
      };
      
      users.push(newUser);
      
      return HttpResponse.json({
        token: 'eyJhbGci...mock-jwt',
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
        },
      });
    } catch (error) {
      return HttpResponse.json(
        { error: 'Registration failed. Please try again.' },
        { status: 500 }
      );
    }
  }),

  // Status endpoints
  http.get('/api/status/cluster', () => {
    return HttpResponse.json(clusterStatus);
  }),

  // Packet endpoints
  http.get('/api/packets', ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const status = url.searchParams.get('status');
    
    let filtered = [...packets];
    if (status) {
      filtered = filtered.filter((p) => p.status === status.toUpperCase());
    }
    
    return HttpResponse.json(filtered.slice(0, limit));
  }),

  http.get('/api/packets/:pktId', ({ params }) => {
    const packet = packets.find((p) => p.pkt_id === params.pktId);
    if (!packet) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }
    
    return HttpResponse.json({
      ...packet,
      payload_preview: 'ENCRYPTED_PAYLOAD_MASKED',
      metadata: {
        ttl_seconds: 86400,
        priority: 'normal',
        attempts: 0,
      },
    });
  }),

  http.post('/api/packets/retry', async ({ request }) => {
    const { pkt_id } = await request.json();
    const packet = packets.find((p) => p.pkt_id === pkt_id);
    if (packet) {
      packet.status = 'QUEUED';
      return HttpResponse.json({
        success: true,
        new_status: 'QUEUED',
        msg: 'Retry enqueued',
      });
    }
    return HttpResponse.json({ error: 'Not found' }, { status: 404 });
  }),

  // Query endpoints
  http.post('/api/query', async ({ request }) => {
    const { question } = await request.json();
    
    // Simulate immediate response
    if (question.toLowerCase().includes('soil')) {
      return HttpResponse.json({
        answer: 'Local soil moisture suggests reducing irrigation today by 10% compared to baseline.',
        provenance: 'LocalCache',
        capsule_id: 'cap_0a1b2c',
        confidence: 0.78,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Simulate queued response
    return HttpResponse.json({
      status: 'ACCEPTED',
      msg: 'Query queued for Main Hub processing. Will respond when available.',
      queue_id: `q_${Date.now()}`,
    }, { status: 202 });
  }),

  // Capsule endpoints
  http.get('/api/capsules', () => {
    return HttpResponse.json(capsules);
  }),

  http.get('/api/capsules/:capsuleId', ({ params }) => {
    const capsule = capsules.find((c) => c.capsule_id === params.capsuleId);
    if (!capsule) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }
    
    return HttpResponse.json({
      ...capsule,
      signed_manifest: {
        author: capsule.author,
        signed_at: capsule.signed_at,
        signature: 'SIG:abcd1234...',
        hash: capsule.question_hash,
      },
      body_preview: 'If field soil moisture < 24% then reduce irrigation by 10% ...',
      status: 'ACTIVE',
    });
  }),
];


