import { useApp } from '../store/useApp';
import { demoRequest } from './demo';

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// All AI calls go through our backend, which forwards the user's key to OpenRouter.
async function request(path, { method = 'POST', body, vision = false, key } = {}) {
  const { settings } = useApp.getState();
  // Offline demo: answer locally, no network or API key needed.
  if (settings.demoMode) return demoRequest(path, body);
  const apiKey = key ?? settings.apiKey;
  const model = vision ? settings.visionModel : settings.textModel;
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['X-OpenRouter-Key'] = apiKey;

  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: method === 'GET' ? undefined : JSON.stringify({ ...body, ...(model ? { model } : {}) }),
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection.', 0, 'NETWORK');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status})`, res.status, data.code);
  return data;
}

export const api = {
  health: () => request('/health', { method: 'GET' }),
  models: () => request('/models', { method: 'GET' }),
  validateKey: (key) => request('/validate-key', { key }),
  generatePlan: (body) => request('/plan/generate', { body }),
  swapItem: (body) => request('/plan/swap', { body }),
  regenerateMeal: (body) => request('/plan/regenerate-meal', { body }),
  analyzeImage: (body) => request('/analyze-image', { body, vision: true }),
  parseFood: (text) => request('/parse-food', { body: { text } }),
  adjustDay: (body) => request('/adjust-day', { body }),
  coach: (body) => request('/coach', { body }),
  groceryList: (body) => request('/grocery-list', { body }),
  recipe: (body) => request('/recipe', { body }),
};

// Profile fields worth sending to the model (no timestamps etc.).
export function profileForAI(p) {
  if (!p) return {};
  const { age, sex, weightKg, heightCm, goal, activity, dietType, cuisine, allergies, dislikes, mealsPerDay, budget, notes } = p;
  return { age, sex, weightKg, heightCm, goal, activity, dietType, cuisine, allergies, dislikes, mealsPerDay, budget, notes };
}
