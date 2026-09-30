import { z } from 'zod';
import { emailSchema } from './common.js';

const passwordSchema = z.string().min(8).max(128).refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be no more than 72 UTF-8 bytes');

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: emailSchema,
  password: passwordSchema
}).strict();

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128)
}).strict();

export const forgotPasswordSchema = z.object({ email: emailSchema }).strict();
export const resetPasswordSchema = z.object({
  token: z.string().min(32).max(256),
  password: passwordSchema
}).strict();
