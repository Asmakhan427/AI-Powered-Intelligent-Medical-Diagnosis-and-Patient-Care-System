import { Router } from 'express';
import * as doctorController from '../controllers/doctor.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  addPatientNoteSchema,
  patientIdParamSchema,
  reviewReportSchema,
  updateAvailabilitySchema,
  updateDoctorProfileSchema,
} from '../validators/doctor.validator';

const router = Router();

// All doctor routes require an authenticated doctor.
router.use(authenticate, authorize('doctor'));

router.get('/profile', doctorController.getProfile);
router.put('/profile', validate(updateDoctorProfileSchema), doctorController.updateProfile);

router.get('/reports/pending', doctorController.getPendingReports);
router.get('/reports/reviewed', doctorController.getReviewedReports);
router.post('/reviews', validate(reviewReportSchema), doctorController.reviewReport);

router.get('/appointments', doctorController.getAppointments);
router.put(
  '/availability',
  validate(updateAvailabilitySchema),
  doctorController.updateAvailability
);

router.get('/stats', doctorController.getStats);

router.get(
  '/patients/:id',
  validate(patientIdParamSchema, 'params'),
  doctorController.getPatientDetail
);
router.post(
  '/patients/:id/notes',
  validate(patientIdParamSchema, 'params'),
  validate(addPatientNoteSchema),
  doctorController.addPatientNote
);

export default router;
