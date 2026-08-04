import { Router } from 'express';
import * as appointmentController from '../controllers/appointment.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { writeLimiter } from '../middleware/rateLimiter.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  appointmentIdParamSchema,
  availableSlotsQuerySchema,
  bookAppointmentSchema,
  updateAppointmentStatusSchema,
} from '../validators/appointment.validator';

const router = Router();

// Public - browsing availability doesn't require login.
router.get(
  '/available-slots',
  validate(availableSlotsQuerySchema, 'query'),
  appointmentController.getAvailableSlots
);

// Protected - any authenticated user (patient) can book/view their own.
router.post(
  '/book',
  authenticate,
  authorize('patient'),
  writeLimiter,
  validate(bookAppointmentSchema),
  appointmentController.bookAppointment
);

router.put(
  '/:id/cancel',
  authenticate,
  validate(appointmentIdParamSchema, 'params'),
  appointmentController.cancelAppointment
);

router.get(
  '/patient',
  authenticate,
  authorize('patient'),
  appointmentController.getPatientAppointments
);

router.get(
  '/doctor',
  authenticate,
  authorize('doctor'),
  appointmentController.getDoctorAppointments
);

router.put(
  '/:id/status',
  authenticate,
  authorize('doctor'),
  validate(appointmentIdParamSchema, 'params'),
  validate(updateAppointmentStatusSchema),
  appointmentController.updateStatus
);

export default router;
