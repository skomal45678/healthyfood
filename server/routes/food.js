import { Router } from 'express';
import { chat, chatJSON } from '../lib/openrouter.js';
import { modelChain } from '../lib/models.config.js';
import { aiRoute } from '../lib/route.js';
import * as S from '../lib/schemas.js';
import {
  SYSTEM_JSON,
  imagePrompt,
  parseFoodPrompt,
  adjustPrompt,
  coachSystem,
  groceryPrompt,
  recipePrompt,
} from '../lib/prompts.js';

const router = Router();

const askText = (key, model, prompt, schema, maxTokens = 2000) =>
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

// Food photo -> detected items with calories and macros.
router.post(
  '/analyze-image',
  aiRoute(S.AnalyzeImageBody, async (body, key) => {
    const { data, model } = await chatJSON({
      key,
      models: modelChain(body.model, 'vision'),
      schema: S.PhotoAnalysis,
      maxTokens: 1500,
      messages: [
        { role: 'system', content: SYSTEM_JSON },
        {
          role: 'user',
          content: [
            { type: 'text', text: imagePrompt(body.hint) },
            { type: 'image_url', image_url: { url: body.image } },
          ],
        },
      ],
    });
    return { ...data, model };
  })
);

// Free text ("2 rotis and a bowl of dal") -> items.
router.post(
  '/parse-food',
  aiRoute(S.ParseFoodBody, async (body, key) => {
    const { data, model } = await askText(key, body.model, parseFoodPrompt(body.text), S.ParsedFood, 1200);
    return { ...data, model };
  })
);

// Rebalance the rest of the day after the user logs what they actually ate.
router.post(
  '/adjust-day',
  aiRoute(S.AdjustBody, async (body, key) => {
    const { data, model } = await askText(key, body.model, adjustPrompt(body), S.AdjustResult, 3000);
    return { ...data, model };
  })
);

router.post(
  '/coach',
  aiRoute(S.CoachBody, async (body, key) => {
    const { text, model } = await chat({
      key,
      models: modelChain(body.model, 'text'),
      temperature: 0.6,
      maxTokens: 900,
      messages: [{ role: 'system', content: coachSystem(body.context) }, ...body.messages],
    });
    return { reply: text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim(), model };
  })
);

router.post(
  '/grocery-list',
  aiRoute(S.GroceryBody, async (body, key) => {
    const { data, model } = await askText(key, body.model, groceryPrompt(body), S.GroceryList, 2000);
    return { ...data, model };
  })
);

router.post(
  '/recipe',
  aiRoute(S.RecipeBody, async (body, key) => {
    const { data, model } = await askText(key, body.model, recipePrompt(body), S.Recipe, 1500);
    return { ...data, model };
  })
);

export default router;
