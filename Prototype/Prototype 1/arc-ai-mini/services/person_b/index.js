const express = require('express');
const { callLLM, providerName } = require('./llmProvider');

const app = express();
app.use(express.json());

const PORT = process.env.PERSON_B_PORT || 5000;

const craftFallbackReply = (payload) => {
  const trimmed = String(payload || '').trim();
  if (!trimmed) {
    return 'Person B says: Please provide more details so I can help.';
  }

  if (trimmed.endsWith('?')) {
    return `Person B says: "${trimmed}" sounds important. Currently I do not have live model access, but I recommend documenting the request and consulting the ARC manual for additional guidance.`;
  }

  return `Person B says: ${trimmed} — acknowledged and queued for manual review.`;
};

app.post('/receive', async (req, res) => {
  const packet = req.body;
  if (!packet || !packet.pkt_id || !packet.payload) {
    return res.status(400).json({ error: 'Invalid packet payload' });
  }

  const timeline = [
    `person_b: received pkt_id=${packet.pkt_id}, beginning analysis`,
    `person_b: evaluating payload "${packet.payload}"`,
  ];
  console.log(timeline[0]);

  let replyText = null;

  if (providerName) {
    timeline.push(`person_b: consulting ${providerName} model for pkt_id=${packet.pkt_id}`);
    try {
      const modelReply = await callLLM(packet.payload);
      if (modelReply) {
        replyText = modelReply;
        timeline.push(
          `person_b: ${providerName} model produced response for pkt_id=${packet.pkt_id}`,
        );
      } else {
        timeline.push(
          `person_b: ${providerName} returned empty response, falling back to deterministic reply`,
        );
      }
    } catch (err) {
      const errorMessage = `person_b: ${providerName} request failed (${err.message})`;
      timeline.push(errorMessage);
      console.error(errorMessage);
    }
  } else {
    timeline.push('person_b: no LLM provider configured, using deterministic reply');
  }

  if (!replyText) {
    replyText = craftFallbackReply(packet.payload);
  }

  timeline.push(`person_b: replying to pkt_id=${packet.pkt_id}`);

  return res.json({
    reply: replyText,
    timeline,
  });
});

app.listen(PORT, () => {
  console.log(`person_b listening on port ${PORT}`);
  if (!providerName) {
    console.log(
      'person_b: LLM provider not configured. Set LLM_PROVIDER=openai or gemini with the appropriate API key env vars for AI responses.',
    );
  } else {
    console.log(`person_b: using ${providerName} model integration`);
  }
});

