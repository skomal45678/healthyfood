import { Router } from 'express';
import { chatJSON } from '../lib/openrouter.js';
import { modelChain } from '../lib/models.config.js';
import { aiRoute } from '../lib/route.js';
import * as S from '../lib/schemas.js';
import { SYSTEM_JSON, planPrompt, swapPrompt, regenerateMealPrompt } from '../lib/prompts.js';

const router = Router();

const ask = (key, model, prompt, schema, maxTokens = 2500) =>
  chatJSON({
    key,
    models: modelChain(model, 'text'),
    schema,
    maxTokens,
    messages: [
      { role: 'system', content: SYSTEM_JSON },
      { role: 'user', content: prompt },
    ],
  });

router.post(
  '/generate',
  aiRoute(S.GeneratePlanBody, async (body, key) => {
    const { data, model } = await ask(key, body.model, planPrompt(body), S.DayPlan, 4000);
    return { ...data, model };
  })
);

router.post(
  '/swap',
  aiRoute(S.SwapBody, async (body, key) => {
    const { data, model } = await ask(key, body.model, swapPrompt(body), S.SwapResult, 800);
    return { ...data, model };
  })
);

router.post(
  '/regenerate-meal',
  aiRoute(S.RegenerateMealBody, async (body, key) => {
    const { data, model } = await ask(key, body.model, regenerateMealPrompt(body), S.SingleMeal, 1500);
    return { ...data, model };
  })
);

export default router;
