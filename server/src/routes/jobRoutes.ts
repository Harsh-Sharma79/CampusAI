import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { getOwnedJob } from '../jobs/queueService.js';
import { asyncHandler, pathParam, validateRequest } from '../utils/http.js';
import { jobIdParams } from '../validators/apiSchemas.js';

export const jobRoutes = Router();
jobRoutes.use(requireAuth);
jobRoutes.get('/:id', validateRequest({ params: jobIdParams }), asyncHandler(async (req, res) => {
  res.json({ success: true, data: await getOwnedJob(req.auth!.userId, pathParam(req)) });
}));
