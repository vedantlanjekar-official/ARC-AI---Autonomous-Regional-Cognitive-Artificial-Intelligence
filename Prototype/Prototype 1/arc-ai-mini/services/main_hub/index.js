const express = require('express');
const fs = require('fs');
const path = require('path');
const {
  upsertPacket,
  updatePacketReply,
  updatePacketStatus,
  replaceTimelineEntries,
} = require('./db');

const app = express();
app.use(express.json());

const PORT = process.env.MAIN_HUB_PORT || 4000;
const PERSON_B_URL = process.env.PERSON_B_URL || 'http://localhost:5000/receive';
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

app.post('/route', async (req, res) => {
  const { packet, timeline = [] } = req.body || {};
  if (!packet || !packet.pkt_id || !packet.src || !packet.dst) {
    return res.status(400).json({ error: 'Invalid packet payload' });
  }

  const packetRowId = upsertPacket({
    pkt_id: packet.pkt_id,
    src: packet.src,
    dst: packet.dst,
    payload: packet.payload,
    signature: packet.signature,
  });

  appendStorage({
    type: 'ingress',
    timestamp: new Date().toISOString(),
    packet,
  });

  const workingTimeline = Array.isArray(timeline) ? [...timeline] : [];
  const logTimeline = (message) => {
    console.log(message);
    workingTimeline.push(message);
  };

  logTimeline(`main_hub: received pkt_id=${packet.pkt_id} from mini_hub`);
  logTimeline(`main_hub: delivered pkt_id=${packet.pkt_id} to person_b`);

  try {
    const personResponse = await fetch(PERSON_B_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(packet),
    });

    if (!personResponse.ok) {
      throw new Error(`person_b responded with ${personResponse.status}`);
    }

    const data = await personResponse.json();
    const personTimeline = Array.isArray(data.timeline) ? data.timeline : [];
    const replyPayload = data.reply;

    workingTimeline.push(...personTimeline);
    const readyMessage = `main_hub: reply pkt_id=${packet.pkt_id} ready for mini_hub`;
    logTimeline(readyMessage);

    updatePacketReply(packet.pkt_id, replyPayload, 'reply_ready');
    replaceTimelineEntries(packetRowId, workingTimeline);

    appendStorage({
      type: 'egress',
      timestamp: new Date().toISOString(),
      packet,
      reply: replyPayload,
      timeline: workingTimeline,
    });

    return res.json({
      reply: replyPayload,
      timeline: workingTimeline,
    });
  } catch (err) {
    const errorMessage = `main_hub: error delivering pkt_id=${packet.pkt_id} (${err.message})`;
    console.error(errorMessage);
    workingTimeline.push(errorMessage);
    updatePacketStatus(packet.pkt_id, 'error');
    replaceTimelineEntries(packetRowId, workingTimeline);

    appendStorage({
      type: 'error',
      timestamp: new Date().toISOString(),
      packet,
      error: err.message,
      timeline: workingTimeline,
    });

    return res.status(502).json({ error: err.message, timeline: workingTimeline });
  }
});

app.listen(PORT, () => {
  console.log(`main_hub listening on port ${PORT}`);
  ensureStorage();
});

