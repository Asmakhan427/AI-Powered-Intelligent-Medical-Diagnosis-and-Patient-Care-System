import { Router } from 'express';
import * as aiController from '../controllers/ai.controller';
import { optionalAuthenticate, authenticate, authorize } from '../middleware/auth.middleware';
import { aiAnalysisLimiter } from '../middleware/rateLimiter.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  analyzeSymptomsSchema,
  doctorRecommendationParamSchema,
  educationTopicParamSchema,
} from '../validators/ai.validator';

const router = Router();

// Public (guest-accessible) but rate-limited: 10 requests/minute.
// optionalAuthenticate attaches req.user when a valid token is present so
// logged-in patients get their analysis persisted automatically.
router.post(
  '/analyze',
  aiAnalysisLimiter,
  optionalAuthenticate,
  validate(analyzeSymptomsSchema),
  aiController.analyzeSymptoms
);

router.get(
  '/education/:topic',
  validate(educationTopicParamSchema, 'params'),
  aiController.getEducation
);

router.get(
  '/doctor/:diagnosis',
  validate(doctorRecommendationParamSchema, 'params'),
  aiController.getDoctorRecommendation
);

router.get('/history', authenticate, authorize('patient'), aiController.getPredictionHistory);

export default router;
