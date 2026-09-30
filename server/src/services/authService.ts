import { randomBytes, randomUUID, createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { getEnv } from '../config/env.js';
import { ApiError } from '../utils/errors.js';
import { assertEmailDeliveryConfigured, sendPasswordResetEmail } from './emailService.js';

const publicUserSelect = {
  id: true, name: true, email: true, avatar: true, role: true,
  universityId: true, courseId: true, semesterId: true, onboardingComplete: true,
  createdAt: true
} as const;

export type PublicUser = Awaited<ReturnType<typeof getPublicUser>>;

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function accessToken(userId: string, role: 'STUDENT' | 'ADMIN', sessionId: string): string {
  const env = getEnv();
  return jwt.sign({ role, sid: sessionId, typ: 'access' }, env.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    subject: userId,
    expiresIn: env.ACCESS_TOKEN_TTL as NonNullable<SignOptions['expiresIn']>,
    issuer: 'campusai-api',
    audience: 'campusai-client'
  });
}

function refreshToken(userId: string, sessionId: string): string {
  const env = getEnv();
  return jwt.sign({ sid: sessionId, typ: 'refresh' }, env.JWT_REFRESH_SECRET, {
    algorithm: 'HS256',
    subject: userId,
    expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d`,
    issuer: 'campusai-api',
    audience: 'campusai-client'
  });
}

async function createRefreshToken(userId: string): Promise<{ id: string; value: string; expiresAt: Date }> {
  const env = getEnv();
  const id = randomUUID();
  const value = refreshToken(userId, id);
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000);
  await prisma.refreshToken.create({ data: { id, userId, tokenHash: sha256(value), expiresAt } });
  return { id, value, expiresAt };
}

export async function getPublicUser(userId: string) {
  return prisma.user.findUnique({ where: { id: userId }, select: publicUserSelect });
}

export async function register(input: { name: string; email: string; password: string }) {
  const passwordHash = await bcrypt.hash(input.password, 12);
  try {
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        settings: { create: {} }
      },
      select: publicUserSelect
    });
    return user;
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      throw new ApiError(409, 'EMAIL_ALREADY_REGISTERED', 'An account with this email already exists');
    }
    throw error;
  }
}

export async function login(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
  }
  const refresh = await createRefreshToken(user.id);
  return { user: await getPublicUser(user.id), accessToken: accessToken(user.id, user.role, refresh.id), refreshToken: refresh.value, expiresAt: refresh.expiresAt };
}

export async function rotateRefreshToken(value: string) {
  let claims: jwt.JwtPayload;
  try {
    const decoded = jwt.verify(value, getEnv().JWT_REFRESH_SECRET, { algorithms: ['HS256'], issuer: 'campusai-api', audience: 'campusai-client' });
    if (typeof decoded === 'string') throw new Error('Invalid refresh claims');
    claims = decoded;
  } catch {
    throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Your session has expired. Sign in again');
  }
  if (claims.typ !== 'refresh' || typeof claims.sid !== 'string' || typeof claims.sub !== 'string') {
    throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Your session has expired. Sign in again');
  }
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash: sha256(value) }, include: { user: { select: { id: true, role: true } } } });
  if (!existing || existing.id !== claims.sid || existing.userId !== claims.sub || existing.revokedAt || existing.expiresAt <= new Date()) {
    throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Your session has expired. Sign in again');
  }

  const nextId = randomUUID();
  const expiresAt = new Date(Date.now() + getEnv().REFRESH_TOKEN_TTL_DAYS * 86_400_000);
  const nextValue = refreshToken(existing.userId, nextId);
  const result = await prisma.$transaction(async (tx) => {
    const revoked = await tx.refreshToken.updateMany({ where: { id: existing.id, revokedAt: null }, data: { revokedAt: new Date() } });
    if (revoked.count !== 1) throw new ApiError(401, 'REFRESH_TOKEN_REUSED', 'This refresh token has already been used');
    await tx.refreshToken.create({ data: { id: nextId, userId: existing.userId, tokenHash: sha256(nextValue), expiresAt } });
    return tx.user.findUnique({ where: { id: existing.userId }, select: publicUserSelect });
  });
  if (!result) throw new ApiError(401, 'ACCOUNT_NOT_FOUND', 'The account no longer exists');
  return { user: result, accessToken: accessToken(existing.userId, existing.user.role, nextId), refreshToken: nextValue, expiresAt };
}

export async function revokeRefreshToken(value: string | undefined): Promise<void> {
  if (!value) return;
  await prisma.refreshToken.updateMany({ where: { tokenHash: sha256(value), revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function requestPasswordReset(email: string): Promise<void> {
  assertEmailDeliveryConfigured();
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
  if (!user) return;

  const env = getEnv();
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60_000);
  await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: sha256(token), expiresAt } });
  try {
    await sendPasswordResetEmail(user.email, token);
  } catch (error) {
    await prisma.passwordResetToken.updateMany({ where: { tokenHash: sha256(token), usedAt: null }, data: { usedAt: new Date() } });
    throw new ApiError(503, 'RESET_EMAIL_FAILED', 'The password-reset email could not be sent. Please try again later');
  }
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const tokenHash = sha256(token);
  const reset = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!reset || reset.usedAt || reset.expiresAt <= new Date()) {
    throw new ApiError(400, 'INVALID_RESET_TOKEN', 'This password-reset link is invalid or expired');
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction(async (tx) => {
    const consumed = await tx.passwordResetToken.updateMany({ where: { id: reset.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
    if (consumed.count !== 1) throw new ApiError(400, 'INVALID_RESET_TOKEN', 'This password-reset link is invalid or expired');
    await tx.user.update({ where: { id: reset.userId }, data: { passwordHash } });
    await tx.refreshToken.updateMany({ where: { userId: reset.userId, revokedAt: null }, data: { revokedAt: new Date() } });
    await tx.passwordResetToken.updateMany({ where: { userId: reset.userId, usedAt: null }, data: { usedAt: new Date() } });
  });
}

export function createAccessTokenForUser(user: { id: string; role: 'STUDENT' | 'ADMIN' }, sessionId: string): string {
  return accessToken(user.id, user.role, sessionId);
}
