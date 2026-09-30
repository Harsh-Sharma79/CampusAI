import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors, { type CorsOptions } from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { getEnv, allowedClientOrigins } from './config/env.js';
import { logger } from './utils/logger.js';
import { ApiError, errorHandler } from './utils/errors.js';
import { authRoutes } from './routes/authRoutes.js';
import { healthRoutes } from './routes/healthRoutes.js';
import { onboardingRoutes } from './routes/onboardingRoutes.js';
import { documentRoutes } from './routes/documentRoutes.js';
import { learningRoutes } from './routes/learningRoutes.js';
import { jobRoutes } from './routes/jobRoutes.js';
import { adminRoutes } from './routes/adminRoutes.js';
import { openApiDocument } from './openapi.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet({ frameguard: false, contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.use((req, res, next) => {
    const startedAt = Date.now();
    res.once('finish', () => logger.info({ method: req.method, path: req.path, statusCode: res.statusCode, durationMs: Date.now() - startedAt }, 'HTTP request'));
    next();
  });

  const origins = allowedClientOrigins();
  app.use((req, _res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.headers.origin && !origins.includes(req.headers.origin)) {
      return next(new ApiError(403, 'ORIGIN_NOT_ALLOWED', 'This client origin is not permitted'));
    }
    next();
  });
  const corsOptions: CorsOptions = {
    origin(origin, callback) {
      if (!origin || origins.includes(origin)) return callback(null, true);
      return callback(new ApiError(403, 'ORIGIN_NOT_ALLOWED', 'This client origin is not permitted'));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    maxAge: 600
  };
  app.use(cors(corsOptions));
  app.use(express.json({ limit: '1mb', strict: true }));
  app.use(express.urlencoded({ extended: false, limit: '16kb', parameterLimit: 50 }));
  app.use(cookieParser());

  const publicDirectory = fileURLToPath(new URL('../public/', import.meta.url));
  app.use(express.static(path.resolve(publicDirectory), { fallthrough: true, index: false, etag: true, maxAge: '1h' }));
  app.get('/', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ service: 'CampusAI API', version: '1.0.0', health: '/api/health/live', docs: '/api/docs' });
  });
  app.get('/api/openapi.json', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(openApiDocument);
  });
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument, { explorer: true, customSiteTitle: 'CampusAI API' }));
  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/onboarding', onboardingRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/jobs', jobRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api', learningRoutes);

  app.use((_req, _res, next) => next(new ApiError(404, 'ROUTE_NOT_FOUND', 'The requested API route does not exist')));
  app.use(errorHandler);
  return app;
}
