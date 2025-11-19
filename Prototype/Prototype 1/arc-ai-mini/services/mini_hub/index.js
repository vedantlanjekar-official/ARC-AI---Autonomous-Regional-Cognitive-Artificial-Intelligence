const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const {
  insertPacket,
  updatePacketReply,
  updatePacketStatus,
  replaceTimelineEntries,
  getRecentPackets,
  getTimelineForPacket,
  getPacketStats,
  createUser,
  findUserByUsername,
  packetExists,
} = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.MINI_HUB_PORT || 3000;
const MAIN_HUB_URL = process.env.MAIN_HUB_URL || 'http://localhost:4000/route';
const JWT_SECRET = process.env.JWT_SECRET || 'mini_hub_dev_secret';
const STORAGE_PATH = path.join(__dirname, 'storage.json');

const ensureStorage = () => {
  if (!fs.existsSync(STORAGE_PATH)) {
    fs.writeFileSync(STORAGE_PATH, JSON.stringify([], null, 2));
  }
};

const appendStorage = (entry) => {
  ensureStorage();
  const existingRaw = fs.readFileSync(STORAGE_PATH, 'utf-8');
  const existing = existingRaw ? JSON.parse(existingRaw) : [];
  existing.push(entry);
  fs.writeFileSync(STORAGE_PATH, JSON.stringify(existing, null, 2));
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const createSignature = (pktId) =>
  Buffer.from(`signed:${pktId ?? ''}`).toString('base64');

const normalizeUsername = (username = '') => username.trim().toLowerCase();

const generateToken = (user) =>
  jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: '12h',
  });

const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authentication token' });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

app.post('/auth/register', (req, res) => {
  const { username, password } = req.body || {};
  const normalized = normalizeUsername(username);

  if (!normalized || normalized.length < 3) {
    return res
      .status(400)
      .json({ error: 'Username must be at least 3 characters long' });
  }

  if (!password || password.length < 6) {
    return res
      .status(400)
      .json({ error: 'Password must be at least 6 characters long' });
  }

  if (!/^[a-z0-9_\-]+$/i.test(normalized)) {
    return res.status(400).json({
      error: 'Username may only contain letters, numbers, underscores, or hyphens',
    });
  }

  const existing = findUserByUsername(normalized);
  if (existing) {
    return res.status(409).json({ error: 'Username already registered' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const userId = createUser(normalized, passwordHash);

  return res.status(201).json({
    message: 'Registration successful',
    username: normalized,
    user_id: userId,
  });
});

app.post('/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const normalized = normalizeUsername(username);
  if (!normalized || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = findUserByUsername(normalized);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = generateToken(user);
  const stats = getPacketStats(user.username);

  return res.json({
    message: 'Login successful',
    token,
    username: user.username,
    stats,
  });
});

app.get('/auth/profile', authenticate, (req, res) => {
  const stats = getPacketStats(req.user.username);
  return res.json({
    username: req.user.username,
    stats,
  });
});

app.get('/packets/recent', authenticate, (req, res) => {
  const limit = Math.min(Number.parseInt(req.query.limit, 10) || 10, 50);
  const packets = getRecentPackets(req.user.username, limit).map((packet) => ({
    ...packet,
    timeline: getTimelineForPacket(packet.pkt_id),
  }));

  return res.json({ packets });
});

app.post('/query', authenticate, async (req, res) => {
  const packet = req.body?.packet || req.body;
  const clientTimeline = Array.isArray(req.body?.client_timeline)
    ? req.body.client_timeline
    : [];

  if (!packet || !packet.pkt_id || !packet.dst || !packet.payload) {
    return res.status(400).json({ error: 'Invalid packet payload' });
  }

  const sourceUser = req.user.username;
  const timestamp = packet.timestamp || new Date().toISOString();

  const packetWithSignature = {
    ...packet,
    src: sourceUser,
    timestamp,
    signature: createSignature(packet.pkt_id),
  };

  let packetRowId;
  try {
    packetRowId = insertPacket({
      pkt_id: packetWithSignature.pkt_id,
      owner: sourceUser,
      src: packetWithSignature.src,
      dst: packetWithSignature.dst,
      payload: packetWithSignature.payload,
      signature: packetWithSignature.signature,
    });
  } catch (err) {
    if (err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Packet already exists' });
    }
    console.error('mini_hub: failed to register packet', err);
    return res.status(500).json({ error: 'Failed to register packet' });
  }

  appendStorage({
    type: 'request',
    timestamp: new Date().toISOString(),
    packet: packetWithSignature,
  });

  const timeline = Array.isArray(clientTimeline) ? [...clientTimeline] : [];
  const logTimeline = (message, level = 'log') => {
    timeline.push(message);
    if (level === 'error') {
      console.error(message);
    } else {
      console.log(message);
    }
  };

  logTimeline(
    `mini_hub: received pkt_id=${packetWithSignature.pkt_id} from ${sourceUser}`,
  );

  let replyPayload;
  let aggregatedTimeline = [];
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    logTimeline(
      `mini_hub: forwarded pkt_id=${packetWithSignature.pkt_id} to main_hub (attempt ${attempt})`,
    );
    try {
      const fetchResponse = await fetch(MAIN_HUB_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packet: packetWithSignature,
          timeline,
        }),
      });

      if (!fetchResponse.ok) {
        throw new Error(`main_hub responded with ${fetchResponse.status}`);
      }

      const data = await fetchResponse.json();
      replyPayload = data.reply;
      aggregatedTimeline = Array.isArray(data.timeline) ? data.timeline : [...timeline];
      break;
    } catch (err) {
      logTimeline(
        `mini_hub: error forwarding pkt_id=${packetWithSignature.pkt_id} (${err.message})`,
        'error',
      );
      updatePacketStatus(packetWithSignature.pkt_id, 'pending');
      if (attempt < maxAttempts) {
        logTimeline(
          `mini_hub: retrying pkt_id=${packetWithSignature.pkt_id} in 500ms (attempt ${
            attempt + 1
          })`,
        );
        await delay(500);
      }
    }
  }

  if (!replyPayload) {
    const finalTimeline = [...timeline];
    const failureMessage = `mini_hub: failed to deliver pkt_id=${packetWithSignature.pkt_id} after ${maxAttempts} attempts`;
    finalTimeline.push(failureMessage);
    updatePacketStatus(packetWithSignature.pkt_id, 'failed');
    replaceTimelineEntries(packetRowId, finalTimeline);
    appendStorage({
      type: 'response',
      timestamp: new Date().toISOString(),
      packet: packetWithSignature,
      error: 'Failed to route packet to main_hub',
      timeline: finalTimeline,
    });
    return res.status(502).json({
      error: 'Failed to route packet to main_hub',
      timeline: finalTimeline,
    });
  }

  const finalLog = `mini_hub: delivered reply to ${sourceUser} for pkt_id=${packetWithSignature.pkt_id}`;
  console.log(finalLog);
  const finalTimeline = [...aggregatedTimeline, finalLog];

  updatePacketReply(packetWithSignature.pkt_id, replyPayload, 'delivered');
  replaceTimelineEntries(packetRowId, finalTimeline);
  appendStorage({
    type: 'response',
    timestamp: new Date().toISOString(),
    packet: packetWithSignature,
    reply: replyPayload,
    timeline: finalTimeline,
  });

  return res.json({
    reply: replyPayload,
    timeline: finalTimeline,
  });
});

app.get('/packets/:pktId/timeline', authenticate, (req, res) => {
  const pktId = req.params.pktId;
  const pktTimeline = getTimelineForPacket(pktId);
  if (!pktTimeline.length && !packetExists(pktId)) {
    return res.status(404).json({ error: 'Packet not found' });
  }
  return res.json({ pkt_id: pktId, timeline: pktTimeline });
});

app.listen(PORT, () => {
  console.log(`mini_hub listening on port ${PORT}`);
  ensureStorage();
});

