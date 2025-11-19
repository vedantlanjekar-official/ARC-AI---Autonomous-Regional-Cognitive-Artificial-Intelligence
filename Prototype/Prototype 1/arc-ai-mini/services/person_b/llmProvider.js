const PROVIDER = (process.env.LLM_PROVIDER || '').toLowerCase();
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const DEFAULT_GEMINI_MODEL = 'gemini-1.5-flash-latest';
const GEMINI_MODEL = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
const GEMINI_FALLBACK_MODELS = [
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash-001',
  'gemini-pro',
];

const hasOpenAI = Boolean(PROVIDER === 'openai' && process.env.OPENAI_API_KEY);
const hasGemini = Boolean(
  PROVIDER === 'gemini' && process.env.GEMINI_API_KEY,
);

const providerName = hasOpenAI
  ? 'openai'
  : hasGemini
    ? 'gemini'
    : null;

const buildPrompt = (payload) => `You are Person B inside an ARC relay network.
The user message routed through the hubs is:
${payload}

Respond with a clear, factual answer in 2-4 sentences. If you are unsure, state assumptions explicitly.`;

const callOpenAI = async (payload) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content:
            'You are Person B, a cooperative subject-matter expert assisting ARC relay operators.',
        },
        { role: 'user', content: buildPrompt(payload) },
      ],
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || `OpenAI error ${response.status}`);
  }

  const choice = data?.choices?.[0]?.message?.content;
  return choice ? choice.trim() : null;
};

const executeGeminiCall = async (model, payload) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: buildPrompt(payload) }],
        },
      ],
      generationConfig: {
        temperature: 0.3,
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const message = data?.error?.message || `Gemini error ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    return null;
  }
  return parts
    .map((part) => part?.text ?? '')
    .join(' ')
    .trim();
};

const callLLM = async (payload) => {
  if (hasOpenAI) {
    return callOpenAI(payload);
  }
  if (hasGemini) {
    const modelsToTry = [GEMINI_MODEL, ...GEMINI_FALLBACK_MODELS].filter(
      (value, index, self) => self.indexOf(value) === index,
    );

    let lastError = null;
    for (const model of modelsToTry) {
      try {
        return await executeGeminiCall(model, payload);
      } catch (err) {
        lastError = err;
        console.warn(
          `person_b: gemini model ${model} failed (${err.message}), trying next fallback`,
        );
      }
    }
    if (lastError) {
      throw lastError;
    }
    return null;
  }
  return null;
};

module.exports = {
  callLLM,
  providerName,
  DEFAULT_GEMINI_MODEL,
  GEMINI_FALLBACK_MODELS,
};

