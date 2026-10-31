# Contributing to HealthyFood

Thanks for helping! HealthyFood is a small, approachable codebase: one Express server and one React app in the same repo.

## Setup

```bash
git clone <your-fork-url> healthyfood && cd healthyfood
npm install                     # server + test deps
npm --prefix client install     # frontend deps
npm run dev                     # API on :3000, Vite on :5173 (proxies /api)
```

Open http://localhost:5173 and add a free key from https://openrouter.ai/keys in **Settings**.

## Before opening a PR

```bash
npm test        # vitest: server routes (OpenRouter mocked) + nutrition maths
npm run build   # production build of the client
npm run lint    # eslint on the client
```

## Where things live

| Area | Files |
|------|-------|
| OpenRouter client, model fallback, JSON repair | `server/lib/openrouter.js`, `server/lib/json.js` |
| Prompts | `server/lib/prompts.js` |
| Response/request validation | `server/lib/schemas.js` (zod) |
| Default free models | `server/lib/models.config.js` |
| API routes | `server/routes/*.js` |
| Calorie and macro maths | `client/src/lib/nutrition.js` |
| App state (localStorage) | `client/src/store/useApp.js` |
| Pages / components | `client/src/pages`, `client/src/components` |

## Guidelines

- **Numbers come from code, food knowledge from AI.** Targets and totals are always computed in `nutrition.js`, never trusted from the model.
- **Every AI response is validated** with a zod schema. If you add an endpoint, add a schema and a mocked test in `tests/server.test.js`.
- **Never log or persist the user's API key** on the server.
- Keep zustand selectors returning stable values; derive computed data with `useMemo` (see `client/src/lib/hooks.js`).
- Match the existing style: small components, Tailwind utility classes, plain JavaScript (ESM).

## Good first issues

- Add a new cuisine-specific prompt hint
- Add more allergen synonyms in `findAllergens`
- Translations / i18n
- Barcode scanning for packaged foods
