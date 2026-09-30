import 'dotenv/config';
import { z } from 'zod';

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return value;
  return ['true', '1', 'yes'].includes(value.toLowerCase());
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  CAMPUSAI_POSTGRES_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),
  GEMINI_TEXT_MODEL: z.string().default('gemini-3.8-flash'),
  GEMINI_EMBEDDING_MODEL: z.string().default('gemini-embedding-2'),
  GEMINI_EMBEDDING_DIMENSIONS: z.coerce.number().int().default(768),
  GEMINI_MAX_INPUT_CHARS: z.coerce.number().int().positive().default(80_000),
  GEMINI_MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().default(4096),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  CLIENT_URLS: z.string().default('http://localhost:5173'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_UPLOAD_MB: z.coerce.number().int().positive().max(100).default(25),
  MAX_DOCUMENT_CHARS: z.coerce.number().int().positive().default(500_000),
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default('auto'),
  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PUBLIC_BASE_URL: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: booleanFromEnv.default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().max(120).default(30),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  AI_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(20),
  AUTH_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(10)
}).superRefine((value, ctx) => {
  if (value.STORAGE_DRIVER === 's3') {
    for (const key of ['S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'] as const) {
      if (!value[key]) ctx.addIssue({ code: 'custom', path: [key], message: `${key} is required when STORAGE_DRIVER=s3` });
    }
  }
  if (value.NODE_ENV === 'production' && value.STORAGE_DRIVER !== 's3') {
    ctx.addIssue({ code: 'custom', path: ['STORAGE_DRIVER'], message: 'Production requires durable S3-compatible storage; local uploads are development-only.' });
  }
  if (value.GEMINI_EMBEDDING_DIMENSIONS !== 768) {
    ctx.addIssue({ code: 'custom', path: ['GEMINI_EMBEDDING_DIMENSIONS'], message: 'The current pgvector migration uses vector(768); change the migration and re-embed before using another dimension.' });
  }
});

export type AppEnv = z.infer<typeof envSchema>;
let cached: AppEnv | undefined;

export function getEnv(): AppEnv {
  if (!cached) {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
      throw new Error(`Invalid server environment: ${details}`);
    }
    cached = parsed.data;
  }
  return cached;
}

export function allowedClientOrigins(): string[] {
  const env = getEnv();
  return [...new Set([env.CLIENT_URL, ...env.CLIENT_URLS.split(',').map((origin) => origin.trim()).filter(Boolean)])];
}
