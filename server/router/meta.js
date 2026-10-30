import { Router } from 'express';
import { OPENROUTER_BASE, resolveKey } from '../lib/openrouter.js';
import { sendError } from '../lib/route.js';
import {
  DEFAULT_TEXT_MODELS,
  DEFAULT_VISION_MODELS,
  EXCLUDED_MODEL_PATTERNS,
} from '../lib/models.config.js';

const router = Router();
const CACHE_MS = 10 * 60 * 1000;
let modelCache = { at: 0, data: null };

router.get('/health', (_req, res) => {
  res.json({ ok: true, uptime: Math.round(process.uptime()), demoKey: Boolean(process.env.OPENROUTER_API_KEY) });
});

// Checks a key against OpenRouter without spending tokens.
router.post('/validate-key', async (req, res) => {
  try {
    const key = resolveKey(req);
    const r = await fetch(`${OPENROUTER_BASE}/key`, { headers: { Authorization: `Bearer ${key}` } });
    if (r.status === 401) return res.status(401).json({ error: 'Invalid OpenRouter API key.', code: 'BAD_KEY' });
    if (!r.ok) return res.status(502).json({ error: `OpenRouter returned HTTP ${r.status}`, code: 'UPSTREAM' });
    const { data } = await r.json();
    res.json({
      ok: true,
      label: data?.label ?? null,
      isFreeTier: data?.is_free_tier ?? null,
      usage: data?.usage ?? null,
      limit: data?.limit ?? null,
    });
  } catch (err) {
    sendError(res, err);
  }
});

const isFree = (m) => Number(m.pricing?.prompt) === 0 && Number(m.pricing?.completion) === 0;

export function summariseModels(list) {
  const free = list.filter(
    (m) =>
      isFree(m) &&
      (m.architecture?.output_modalities ?? ['text']).includes('text') &&
      !EXCLUDED_MODEL_PATTERNS.some((re) => re.test(m.id))
  );
  const toItem = (m) => ({ id: m.id, name: m.name || m.id, context: m.context_length || null });
  const vision = free.filter((m) => (m.architecture?.input_modalities ?? []).includes('image'));
  return {
    text: free.map(toItem),
    vision: vision.map(toItem),
    defaults: { text: DEFAULT_TEXT_MODELS[0], vision: DEFAULT_VISION_MODELS[0] },
  };
}

// Live list of free models, so the app keeps working as OpenRouter's catalogue changes.
router.get('/models', async (_req, res) => {
  if (modelCache.data && Date.now() - modelCache.at < CACHE_MS) return res.json(modelCache.data);
  try {
    const r = await fetch(`${OPENROUTER_BASE}/models`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const { data } = await r.json();
    modelCache = { at: Date.now(), data: summariseModels(data ?? []) };
    res.json(modelCache.data);
  } catch (err) {
    console.warn('[models] could not fetch model list:', err.message);
    const toItem = (id) => ({ id, name: id, context: null });
    res.json({
      text: DEFAULT_TEXT_MODELS.map(toItem),
      vision: DEFAULT_VISION_MODELS.map(toItem),
      defaults: { text: DEFAULT_TEXT_MODELS[0], vision: DEFAULT_VISION_MODELS[0] },
      offline: true,
    });
  }
});

export default router;
