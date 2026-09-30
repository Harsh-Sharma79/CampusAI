import type { RequestHandler } from 'express';
import * as onboarding from '../services/onboardingService.js';
import { ApiError } from '../utils/errors.js';

export const getOnboarding: RequestHandler = async (req, res, next) => {
  try {
    const data = await onboarding.getOnboarding(req.auth!.userId);
    if (!data) throw new ApiError(404, 'USER_NOT_FOUND', 'The account no longer exists');
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const saveOnboarding: RequestHandler = async (req, res, next) => {
  try {
    const data = await onboarding.saveOnboarding(req.auth!.userId, req.body);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};
