import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';
import { ApiError } from './errors.js';

export type AsyncRoute = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export function asyncHandler(handler: AsyncRoute): RequestHandler {
  return (req, res, next) => { void handler(req, res, next).catch(next); };
}

export function pathParam(req: Request, name = 'id'): string {
  const value = req.params[name];
  if (typeof value !== 'string' || value.length === 0) throw new ApiError(400, 'INVALID_ROUTE_PARAMETER', 'A required route identifier is invalid');
  return value;
}

export function validateRequest(schemas: {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}): RequestHandler {
  return (req, res, next) => {
    try {
      const validated: { body?: unknown; params?: unknown; query?: unknown } = {};
      if (schemas.body) validated.body = req.body = schemas.body.parse(req.body);
      if (schemas.params) validated.params = req.params = schemas.params.parse(req.params) as typeof req.params;
      if (schemas.query) validated.query = schemas.query.parse(req.query);
      res.locals.validatedRequest = validated;
      next();
    } catch (error) {
      next(error);
    }
  };
}
