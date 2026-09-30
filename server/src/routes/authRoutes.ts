import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as controller from '../controllers/authController.js';
import { getEnv } from '../config/env.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateRequest } from '../utils/http.js';
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from '../validators/authSchemas.js';

export const authRoutes = Router();
const authLimiter = rateLimit({ windowMs: 60_000, limit: getEnvSafeAuthLimit(), standardHeaders: 'draft-8', legacyHeaders: false });
function getEnvSafeAuthLimit(): number {
  try { return getEnv().AUTH_RATE_LIMIT_PER_MINUTE; } catch { return 10; }
}

authRoutes.post('/register', authLimiter, validateRequest({ body: registerSchema }), controller.register);
authRoutes.post('/login', authLimiter, validateRequest({ body: loginSchema }), controller.login);
authRoutes.post('/logout', controller.logout);
authRoutes.post('/refresh', authLimiter, controller.refresh);
authRoutes.get('/me', requireAuth, controller.me);
authRoutes.post('/forgot-password', authLimiter, validateRequest({ body: forgotPasswordSchema }), controller.forgotPassword);
authRoutes.post('/reset-password', authLimiter, validateRequest({ body: resetPasswordSchema }), controller.resetPassword);
