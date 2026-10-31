import { extractJson } from './json.js';

export const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const TIMEOUT_MS = 60_000;

export class AIError extends Error {
  constructor(message, status = 502, code = 'AI_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// The user's key arrives per request and is never stored or logged.
export function resolveKey(req) {
  const fromHeader = req.get('x-openrouter-key')?.trim();
  const key = fromHeader || process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new AIError('No OpenRouter API key. Add your free key in Settings.', 401, 'NO_KEY');
  }
  return key;
}

function headers(key) {
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.APP_URL || 'https://github.com/healthyfood/healthyfood',
    'X-Title': 'HealthyFood',
  };
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function contentToText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((p) => p?.text ?? '').join('');
  return '';
}

// Try each model in order. Auth/billing errors stop immediately; rate limits,
// unavailable models and empty answers fall through to the next model.
export async function chat({ key, models, messages, temperature = 0.4, maxTokens = 2500 }) {
  let lastError = null;
  for (const model of models) {
    let res;
    try {
      res = await fetchWithTimeout(`${OPENROUTER_BASE}/chat/completions`, {
        method: 'POST',
        headers: headers(key),
        body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
      });
    } catch (err) {
      lastError = new AIError(
        err.name === 'AbortError' ? `Model ${model} timed out` : `Network error: ${err.message}`,
        504,
        'TIMEOUT'
      );
      continue;
    }

    if (res.status === 401) throw new AIError('Invalid OpenRouter API key. Check it in Settings.', 401, 'BAD_KEY');
    if (res.status === 402) throw new AIError('OpenRouter says this key has no credits for that model. Pick a ":free" model.', 402, 'NO_CREDITS');

    let data = null;
    try {
      data = await res.json();
    } catch {
      /* non-JSON body */
    }

    if (!res.ok || data?.error) {
      const msg = data?.error?.message || `HTTP ${res.status}`;
      lastError =
        res.status === 429
          ? new AIError('Free models are rate-limited right now. Wait a minute and try again.', 429, 'RATE_LIMIT')
          : new AIError(`Model ${model} failed: ${msg}`, 502, 'MODEL_ERROR');
      continue;
    }

    const text = contentToText(data?.choices?.[0]?.message?.content).trim();
    if (!text) {
      lastError = new AIError(`Model ${model} returned an empty answer`, 502, 'EMPTY');
      continue;
    }
    return { text, model: data.model || model, requested: model };
  }
  throw lastError || new AIError('No model available', 502, 'NO_MODEL');
}

// Ask for JSON, validate with a zod schema, and give the model one chance to
// repair its own output before falling through to the next model.
export async function chatJSON({ key, models, messages, schema, temperature = 0.3, maxTokens = 2500 }) {
  let lastError = null;
  for (let i = 0; i < models.length; i++) {
    const chain = models.slice(i);
    // chat() itself walks the remaining chain, so its errors are final.
    const reply = await chat({ key, models: chain, messages, temperature, maxTokens });
    const attempt = tryParse(reply.text, schema);
    if (attempt.ok) return { data: attempt.data, model: reply.model };

    try {
      const repair = await chat({
        key,
        models: [reply.requested, ...chain.filter((m) => m !== reply.requested)],
        temperature: 0,
        maxTokens,
        messages: [
          ...messages,
          { role: 'assistant', content: reply.text.slice(0, 8000) },
          {
            role: 'user',
            content: `That reply was not valid JSON for the required shape (${attempt.error}). Reply again with ONLY the corrected JSON object, no prose, no markdown.`,
          },
        ],
      });
      const second = tryParse(repair.text, schema);
      if (second.ok) return { data: second.data, model: repair.model };
      lastError = new AIError(`Model returned invalid data: ${second.error}`, 502, 'BAD_JSON');
    } catch (err) {
      if (err.status === 401 || err.status === 402) throw err;
      lastError = err;
    }
    // Skip to the model after the one that produced bad output.
    const used = models.indexOf(reply.requested);
    if (used > i) i = used;
  }
  throw lastError || new AIError('Model returned invalid data', 502, 'BAD_JSON');
}

function tryParse(text, schema) {
  try {
    const raw = extractJson(text);
    const parsed = schema.safeParse(raw);
    if (parsed.success) return { ok: true, data: parsed.data };
    const issue = parsed.error.issues[0];
    return { ok: false, error: `${issue?.path?.join('.') || 'root'}: ${issue?.message}` };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
