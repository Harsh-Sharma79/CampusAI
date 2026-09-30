import type { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { MulterError } from 'multer';
import { ZodError } from 'zod';
import { logger } from './logger.js';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details: error.issues.map(({ path, message }) => ({ path: path.join('.'), message })) } });
    return;
  }

  if (error instanceof ApiError) {
    res.status(error.status).json({
      success: false,
      error: { code: error.code, message: error.message, ...(error.details === undefined ? {} : { details: error.details }) }
    });
    return;
  }

  if (error instanceof MulterError) {
    const tooLarge = error.code === 'LIMIT_FILE_SIZE';
    res.status(tooLarge ? 413 : 400).json({ success: false, error: {
      code: tooLarge ? 'FILE_TOO_LARGE' : 'INVALID_MULTIPART_REQUEST',
      message: tooLarge ? 'The uploaded file exceeds the configured size limit' : 'The multipart upload is invalid'
    } });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'A record with those details already exists' } });
      return;
    }
    if (error.code === 'P2025') {
      res.status(404).json({ success: false, error: { code: 'RECORD_NOT_FOUND', message: 'The requested record was not found' } });
      return;
    }
  }

  const status = typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number'
    ? error.status
    : 500;
  const code = typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
    ? error.code
    : 'INTERNAL_ERROR';
  logger.error({ err: error, method: req.method, path: req.path }, 'Unhandled request error');
  res.status(status >= 400 && status < 600 ? status : 500).json({
    success: false,
    error: {
      code,
      message: status < 500 && error instanceof Error ? error.message : 'An unexpected server error occurred'
    }
  });
};
