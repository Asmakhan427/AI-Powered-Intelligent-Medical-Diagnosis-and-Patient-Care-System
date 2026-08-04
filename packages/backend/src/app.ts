import './config/env'; // validate env before anything else imports it
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import v1Router from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.middleware';
import { generalLimiter } from './middleware/rateLimiter.middleware';
import { isDatabaseHealthy } from './config/database';
import { isRedisHealthy } from './config/redis';
import { CORS_ORIGINS, API_PREFIX } from './config/env';

export function createApp() {
  const app = express();

  // Behind a reverse proxy (nginx/Render/etc.) — trust the first hop so
  // req.ip and the rate limiter see the real client address.
  app.set('trust proxy', 1);

  // ---------- Security headers ----------
  app.use(
    helmet({
      // API only serves JSON; a strict CSP that blocks cross-origin loads is fine.
      crossOriginResourcePolicy: { policy: 'same-site' },
    })
  );

  // ---------- CORS ----------
  app.use(
    cors({
      origin: CORS_ORIGINS,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
      maxAge: 86400,
    })
  );

  // ---------- Body parsing & compression ----------
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(compression());

  // ---------- Health check (before rate limiting) ----------
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      status: 'ok',
      db: isDatabaseHealthy() ? 'up' : 'down',
      redis: isRedisHealthy() ? 'up' : 'disabled/down',
    });
  });

  // ---------- Global rate limit ----------
  app.use(generalLimiter);

  // ---------- Versioned API surface: /api/v1/... ----------
  app.use(API_PREFIX, v1Router);

  // ---------- 404 + centralized error handler (registered last, in order) ----------
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
