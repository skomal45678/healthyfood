import { AIError, resolveKey } from './openrouter.js';

// Wraps an AI endpoint: validates the body with a zod schema, resolves the
// caller's OpenRouter key and turns thrown errors into JSON responses.
export function aiRoute(bodySchema, handler) {
  return async (req, res) => {
    const parsed = bodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return res.status(400).json({
        error: `Invalid request: ${issue.path.join('.') || 'body'} ${issue.message}`,
        code: 'BAD_REQUEST',
      });
    }
    try {
      const key = resolveKey(req);
      const result = await handler(parsed.data, key, req);
      res.json(result);
    } catch (err) {
      sendError(res, err);
    }
  };
}

export function sendError(res, err) {
  if (err instanceof AIError) {
    return res.status(err.status).json({ error: err.message, code: err.code });
  }
  console.error('[api] unexpected error:', err?.message);
  res.status(500).json({ error: 'Something went wrong on the server.', code: 'SERVER_ERROR' });
}
