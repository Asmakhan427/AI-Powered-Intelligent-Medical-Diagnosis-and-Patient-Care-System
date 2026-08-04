import { Router } from 'express';
import * as patientController from '../controllers/patient.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  notificationIdParamSchema,
  updatePatientProfileSchema,
} from '../validators/patient.validator';

const router = Router();

// All patient routes require an authenticated patient.
router.use(authenticate, authorize('patient'));

router.get('/profile', patientController.getProfile);
router.put('/profile', validate(updatePatientProfileSchema), patientController.updateProfile);

router.get('/history', patientController.getHistory);
router.get('/reports', patientController.getReports);
router.get('/stats', patientController.getStats);

router.get('/notifications', patientController.getNotifications);
router.put(
  '/notifications/:id',
  validate(notificationIdParamSchema, 'params'),
  patientController.markNotificationRead
);

export default router;
