import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { asyncHandler } from '../utils/http.js';

export const healthRoutes = Router();
healthRoutes.get('/live', (_req, res) => res.json({ status: 'ok' }));
healthRoutes.get('/ready', asyncHandler(async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: 'ready', database: 'connected' });
}));
