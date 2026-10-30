import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/index.js';
import { extractJson } from '../server/lib/json.js';
import { modelChain } from '../server/lib/models.config.js';
import { summariseModels } from '../server/routes/meta.js';
import { PhotoAnalysis } from '../server/lib/schemas.js';

const app = createApp();

function completion(content, model = 'test/model:free') {
  return new Response(JSON.stringify({ model, choices: [{ message: { content } }] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('extractJson', () => {
  it('parses fenced JSON with surrounding prose', () => {
    expect(extractJson('Sure!\n```json\n{"a": 1}\n```\nEnjoy')).toEqual({ a: 1 });
  });
  it('ignores <think> blocks and braces inside strings', () => {
    expect(extractJson('<think>{bad}</think> {"s": "a } b", "n": [1,2]}')).toEqual({ s: 'a } b', n: [1, 2] });
  });
  it('tolerates trailing commas', () => {
    expect(extractJson('{"items": [1, 2,],}')).toEqual({ items: [1, 2] });
  });
  it('throws when there is no JSON', () => {
    expect(() => extractJson('no json here')).toThrow();
  });
});

describe('schemas', () => {
  it('coerces string numbers and fills defaults', () => {
    const r = PhotoAnalysis.parse({ dish: 'Toast', items: [{ name: 'Bread', kcal: '80 kcal', protein: '3' }] });
    expect(r.items[0]).toMatchObject({ kcal: 80, protein: 3, carbs: 0, qty: 1, unit: 'serving' });
    expect(r.isFood).toBe(true);
  });
});

describe('modelChain', () => {
  it('puts the preferred model first, dedupes and caps length', () => {
    const chain = modelChain('google/gemma-4-31b-it:free');
    expect(chain[0]).toBe('google/gemma-4-31b-it:free');
    expect(new Set(chain).size).toBe(chain.length);
    expect(chain.length).toBeLessThanOrEqual(4);
  });
});

describe('summariseModels', () => {
  it('keeps free text models and tags vision ones', () => {
    const out = summariseModels([
      { id: 'a:free', pricing: { prompt: '0', completion: '0' }, architecture: { input_modalities: ['text'], output_modalities: ['text'] } },
      { id: 'b:free', pricing: { prompt: '0', completion: '0' }, architecture: { input_modalities: ['text', 'image'], output_modalities: ['text'] } },
      { id: 'paid', pricing: { prompt: '0.001', completion: '0.002' }, architecture: { input_modalities: ['text'] } },
      { id: 'x/content-safety:free', pricing: { prompt: '0', completion: '0' } },
    ]);
    expect(out.text.map((m) => m.id)).toEqual(['a:free', 'b:free']);
    expect(out.vision.map((m) => m.id)).toEqual(['b:free']);
  });
});

describe('API', () => {
  it('GET /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('rejects requests without an API key', async () => {
    const saved = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    const res = await request(app).post('/api/parse-food').send({ text: '2 eggs' });
    process.env.OPENROUTER_API_KEY = saved ?? '';
    if (!saved) delete process.env.OPENROUTER_API_KEY;
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('NO_KEY');
  });

  it('validates the request body', async () => {
    const res = await request(app).post('/api/parse-food').set('X-OpenRouter-Key', 'k').send({});
    expect(res.status).toBe(400);
  });

  it('parses food text and forwards the key to OpenRouter', async () => {
    const fetchMock = vi.fn(async () =>
      completion('```json\n{"items":[{"name":"Egg","qty":2,"unit":"piece","kcal":155,"protein":13,"carbs":1,"fat":11}]}\n```')
    );
    vi.stubGlobal('fetch', fetchMock);
    const res = await request(app).post('/api/parse-food').set('X-OpenRouter-Key', 'sk-test').send({ text: '2 eggs' });
    expect(res.status).toBe(200);
    expect(res.body.items[0]).toMatchObject({ name: 'Egg', kcal: 155 });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer sk-test');
  });

  it('repairs invalid JSON with a second call', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(completion('I think it is about 200 calories.'))
      .mockResolvedValueOnce(completion('{"items":[{"name":"Apple","kcal":95}]}'));
    vi.stubGlobal('fetch', fetchMock);
    const res = await request(app).post('/api/parse-food').set('X-OpenRouter-Key', 'k').send({ text: 'an apple' });
    expect(res.status).toBe(200);
    expect(res.body.items[0].name).toBe('Apple');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('falls back to the next model on 429', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: 'rate limited' } }), { status: 429 }))
      .mockResolvedValueOnce(completion('{"items":[{"name":"Banana","kcal":105}]}', 'second:free'));
    vi.stubGlobal('fetch', fetchMock);
    const res = await request(app).post('/api/parse-food').set('X-OpenRouter-Key', 'k').send({ text: 'banana' });
    expect(res.status).toBe(200);
    expect(res.body.model).toBe('second:free');
  });

  it('returns 401 for a bad key without trying other models', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    const res = await request(app).post('/api/parse-food').set('X-OpenRouter-Key', 'bad').send({ text: 'rice' });
    expect(res.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns 429 when every model is rate-limited', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 429 })));
    const res = await request(app).post('/api/parse-food').set('X-OpenRouter-Key', 'k').send({ text: 'rice' });
    expect(res.status).toBe(429);
    expect(res.body.code).toBe('RATE_LIMIT');
  });

  it('sends the photo as an image_url part to a vision model', async () => {
    const fetchMock = vi.fn(async () =>
      completion('{"isFood":true,"dish":"Salad","items":[{"name":"Lettuce","kcal":10,"confidence":0.9}],"healthScore":9}')
    );
    vi.stubGlobal('fetch', fetchMock);
    const res = await request(app)
      .post('/api/analyze-image')
      .set('X-OpenRouter-Key', 'k')
      .send({ image: 'data:image/jpeg;base64,AAAA' });
    expect(res.status).toBe(200);
    expect(res.body.dish).toBe('Salad');
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.messages[1].content[1]).toEqual({ type: 'image_url', image_url: { url: 'data:image/jpeg;base64,AAAA' } });
  });

  it('unknown API routes return JSON 404', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
  });
});
