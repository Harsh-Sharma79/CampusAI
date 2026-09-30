import type { CookieOptions, RequestHandler } from 'express';
import { getEnv } from '../config/env.js';
import * as authService from '../services/authService.js';
import { ApiError } from '../utils/errors.js';

const ACCESS_COOKIE = 'campusai_access';
const REFRESH_COOKIE = 'campusai_refresh';

function cookieOptions(maxAge: number): CookieOptions {
  const production = getEnv().NODE_ENV === 'production';
  return { httpOnly: true, secure: production, sameSite: production ? 'none' : 'lax', path: '/', maxAge };
}

function setSessionCookies(res: Parameters<RequestHandler>[1], session: { accessToken: string; refreshToken: string; expiresAt: Date }): void {
  const env = getEnv();
  const accessMaxAge = 15 * 60 * 1000;
  res.cookie(ACCESS_COOKIE, session.accessToken, cookieOptions(accessMaxAge));
  res.cookie(REFRESH_COOKIE, session.refreshToken, cookieOptions(env.REFRESH_TOKEN_TTL_DAYS * 86_400_000));
}

function clearSessionCookies(res: Parameters<RequestHandler>[1]): void {
  const production = getEnv().NODE_ENV === 'production';
  const options: CookieOptions = { httpOnly: true, secure: production, sameSite: production ? 'none' : 'lax', path: '/' };
  res.clearCookie(ACCESS_COOKIE, options);
  res.clearCookie(REFRESH_COOKIE, options);
}

export const register: RequestHandler = async (req, res, next) => {
  try {
    const user = await authService.register(req.body as { name: string; email: string; password: string });
    const session = await authService.login({ email: user.email, password: (req.body as { password: string }).password });
    setSessionCookies(res, session);
    res.status(201).json({ success: true, data: { user: session.user } });
  } catch (error) { next(error); }
};

export const login: RequestHandler = async (req, res, next) => {
  try {
    const session = await authService.login(req.body as { email: string; password: string });
    setSessionCookies(res, session);
    res.json({ success: true, data: { user: session.user } });
  } catch (error) { next(error); }
};

export const refresh: RequestHandler = async (req, res, next) => {
  try {
    const value = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!value) throw new ApiError(401, 'REFRESH_TOKEN_REQUIRED', 'A refresh session is required');
    const session = await authService.rotateRefreshToken(value);
    setSessionCookies(res, session);
    res.json({ success: true, data: { user: session.user } });
  } catch (error) { next(error); }
};

export const logout: RequestHandler = async (req, res, next) => {
  try {
    await authService.revokeRefreshToken(req.cookies?.[REFRESH_COOKIE] as string | undefined);
    clearSessionCookies(res);
    res.status(204).end();
  } catch (error) { next(error); }
};

export const me: RequestHandler = async (req, res, next) => {
  try {
    const user = await authService.getPublicUser(req.auth!.userId);
    if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'The account no longer exists');
    res.json({ success: true, data: { user } });
  } catch (error) { next(error); }
};

export const forgotPassword: RequestHandler = async (req, res, next) => {
  try {
    await authService.requestPasswordReset((req.body as { email: string }).email);
    res.status(202).json({ success: true, data: { message: 'If an account exists for that address, a password-reset link will be sent.' } });
  } catch (error) { next(error); }
};

export const resetPassword: RequestHandler = async (req, res, next) => {
  try {
    const input = req.body as { token: string; password: string };
    await authService.resetPassword(input.token, input.password);
    clearSessionCookies(res);
    res.json({ success: true, data: { message: 'Password updated. Sign in with your new password.' } });
  } catch (error) { next(error); }
};
