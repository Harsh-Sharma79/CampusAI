import { Router } from 'express';
import * as controller from '../controllers/onboardingController.js';
import { requireAuth, requireStudent } from '../middleware/requireAuth.js';
import { validateRequest } from '../utils/http.js';
import { onboardingSchema } from '../validators/onboardingSchemas.js';

export const onboardingRoutes = Router();
onboardingRoutes.use(requireAuth, requireStudent);
onboardingRoutes.get('/', controller.getOnboarding);
onboardingRoutes.put('/', validateRequest({ body: onboardingSchema }), controller.saveOnboarding);
