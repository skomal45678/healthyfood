// Default free models, tried in order when the user's chosen model fails.
// OpenRouter's free catalogue changes often: the UI also lists whatever is
// currently free via GET /api/models, so these are only sensible fallbacks.
// `openrouter/free` is OpenRouter's router that picks any available free model.
export const DEFAULT_TEXT_MODELS = [
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3.5-lightning:free',
  'google/gemma-4-26b-a4b-it:free',
  'openrouter/free',
];

export const DEFAULT_VISION_MODELS = [
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3.5-super-vl:free',
  'google/gemma-4-26b-a4b-it:free',
  'openrouter/free',
];

// Free-priced models that are not general chat models.
export const EXCLUDED_MODEL_PATTERNS = [/content-safety/i, /lyria/i, /guard/i, /embed/i];

const MAX_ATTEMPTS = 4;

export function modelChain(preferred, kind = 'text') {
  const defaults = kind === 'vision' ? DEFAULT_VISION_MODELS : DEFAULT_TEXT_MODELS;
  const chain = [preferred, ...defaults].filter(
    (m) => typeof m === 'string' && m.trim() && m.length < 200
  );
  return [...new Set(chain.map((m) => m.trim()))].slice(0, MAX_ATTEMPTS);
}
