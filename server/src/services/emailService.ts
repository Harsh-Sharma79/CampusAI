import nodemailer from 'nodemailer';
import { getEnv } from '../config/env.js';
import { ApiError } from '../utils/errors.js';

function transporter() {
  const env = getEnv();
  if (!env.SMTP_HOST || !env.SMTP_FROM) {
    throw new ApiError(503, 'EMAIL_DELIVERY_NOT_CONFIGURED', 'Password-reset email delivery is not configured');
  }
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    ...(env.SMTP_USER && env.SMTP_PASSWORD ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } } : {}),
    tls: { rejectUnauthorized: true },
    disableFileAccess: true,
    disableUrlAccess: true
  });
}

export function assertEmailDeliveryConfigured(): void {
  const env = getEnv();
  if (!env.SMTP_HOST || !env.SMTP_FROM) {
    throw new ApiError(503, 'EMAIL_DELIVERY_NOT_CONFIGURED', 'Password-reset email delivery is not configured');
  }
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const env = getEnv();
  const url = new URL('/reset-password', env.CLIENT_URL);
  url.searchParams.set('token', token);
  await transporter().sendMail({
    from: env.SMTP_FROM,
    to: email,
    subject: 'Reset your CampusAI password',
    text: `Use this link to reset your password. It expires in ${env.PASSWORD_RESET_TTL_MINUTES} minutes: ${url.toString()}`
  });
}
