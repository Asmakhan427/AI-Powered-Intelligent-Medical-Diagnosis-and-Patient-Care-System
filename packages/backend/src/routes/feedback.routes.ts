import { Router } from 'express';
import * as feedbackController from '../controllers/feedback.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { feedbackIdParamSchema, submitFeedbackSchema } from '../validators/feedback.validator';

const router = Router();

router.use(authenticate);

// NOTE: '/stats' is registered before '/:id' so it isn't swallowed by the
// param route.
router.get('/stats', feedbackController.getStats);
router.post('/submit', validate(submitFeedbackSchema), feedbackController.submitFeedback);
router.get('/:id', validate(feedbackIdParamSchema, 'params'), feedbackController.getFeedback);

export default router;
