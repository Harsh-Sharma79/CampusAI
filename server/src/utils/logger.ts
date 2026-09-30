import pino from 'pino';
import { getEnv } from '../config/env.js';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: {
    paths: [
      'password', 'passwordHash', 'token', 'accessToken', 'refreshToken', 'tokenHash',
      'authorization', 'headers.authorization', 'req.headers.authorization',
      'apiKey', 'GEMINI_API_KEY', 'SMTP_PASSWORD', 'S3_SECRET_ACCESS_KEY',
      'documentText', 'content', 'studentAnswer', 'body.password', 'body.token'
    ],
    censor: '[REDACTED]'
  },
  serializers: {
    err: pino.stdSerializers.err
  },
  base: { service: 'campusai-api' }
});
