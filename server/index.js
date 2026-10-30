import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import metaRoutes from './routes/meta.js';
import planRoutes from './routes/plan.js';
import foodRoutes from './routes/food.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.resolve(__dirname, '../client/dist');

export function createApp() {
  const app = express();
  app.set('trust proxy', 1); // Render sits behind a proxy
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          styleSrc: ["'self'", "'unsafe-inline'"],
          connectSrc: ["'self'"],
          workerSrc: ["'self'"],
          manifestSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));

  const api = express.Router();
  api.use(
    rateLimit({
      windowMs: 60_000,
      limit: Number(process.env.RATE_LIMIT_PER_MIN) || 60,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { error: 'Too many requests, slow down a little.', code: 'RATE_LIMIT' },
    })
  );
  api.use(metaRoutes);
  api.use('/plan', planRoutes);
  api.use(foodRoutes);
  api.use((_req, res) => res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' }));
  app.use('/api', api);

  // Malformed JSON / oversized bodies.
  app.use('/api', (err, _req, res, _next) => {
    const status = err.status || 500;
    res.status(status).json({
      error: status === 413 ? 'Image too large, please use a smaller photo.' : 'Bad request body.',
      code: 'BAD_REQUEST',
    });
  });

  // Serve the built React app with SPA fallback.
  if (fs.existsSync(CLIENT_DIST)) {
    app.use(express.static(CLIENT_DIST, { index: false, maxAge: '1h' }));
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      res.sendFile(path.join(CLIENT_DIST, 'index.html'));
    });
  } else {
    app.get('/', (_req, res) =>
      res.type('text').send('HealthyFood API is running. Build the client with `npm run build`, or use `npm run dev`.')
    );
  }

  return app;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const port = Number(process.env.PORT) || 3000;
  createApp().listen(port, () => console.log(`HealthyFood listening on http://localhost:${port}`));
}
