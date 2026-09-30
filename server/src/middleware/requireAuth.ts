import type { RequestHandler } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { getEnv } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';

const ACCESS_COOKIE = 'campusai_access';

type AccessClaims = JwtPayload & { sub: string; role: 'STUDENT' | 'ADMIN'; sid: string; typ: 'access' };

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const env = getEnv();
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : undefined;
  const token = req.cookies?.[ACCESS_COOKIE] as string | undefined ?? bearer;
  if (!token) return next(new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Sign in to continue'));
  let claims: AccessClaims;
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'], issuer: 'campusai-api', audience: 'campusai-client' });
    if (typeof decoded === 'string') throw new Error('Invalid access claims');
    claims = decoded as AccessClaims;
  } catch {
    return next(new ApiError(401, 'INVALID_OR_EXPIRED_TOKEN', 'Your session is invalid or expired'));
  }
  if (claims.typ !== 'access' || !claims.sub || !claims.sid || !['STUDENT', 'ADMIN'].includes(claims.role)) {
    return next(new ApiError(401, 'INVALID_OR_EXPIRED_TOKEN', 'Your session is invalid or expired'));
  }
  let activeSession: { id: string } | null;
  try {
    activeSession = await prisma.refreshToken.findFirst({ where: { id: claims.sid, userId: claims.sub, revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true } });
  } catch (error) {
    return next(error);
  }
  if (!activeSession) return next(new ApiError(401, 'INVALID_OR_EXPIRED_TOKEN', 'Your session is invalid or expired'));
  req.auth = { userId: claims.sub, role: claims.role, sessionId: claims.sid };
  next();
};

export const requireStudent: RequestHandler = (req, _res, next) => {
  if (!req.auth) return next(new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Sign in to continue'));
  if (req.auth.role !== 'STUDENT') return next(new ApiError(403, 'STUDENT_ACCESS_REQUIRED', 'Student access is required'));
  next();
};

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.auth) return next(new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Sign in to continue'));
  if (req.auth.role !== 'ADMIN') return next(new ApiError(403, 'ADMIN_ACCESS_REQUIRED', 'Administrator access is required'));
  next();
};
