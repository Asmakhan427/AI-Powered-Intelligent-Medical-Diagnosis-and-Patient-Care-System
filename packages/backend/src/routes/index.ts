import { Router } from 'express';
import authRoutes from './auth.routes';
import patientRoutes from './patient.routes';
import doctorRoutes from './doctor.routes';
import doctorsRoutes from './doctors.routes';
import appointmentRoutes from './appointment.routes';
import aiRoutes from './ai.routes';
import feedbackRoutes from './feedback.routes';

const v1Router = Router();

v1Router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

v1Router.use('/auth', authRoutes);
v1Router.use('/patient', patientRoutes);
v1Router.use('/doctor', doctorRoutes); // authenticated doctor's own profile/reports/appointments
v1Router.use('/doctors', doctorsRoutes); // public doctor browsing/search
v1Router.use('/appointments', appointmentRoutes);
v1Router.use('/ai', aiRoutes);
v1Router.use('/feedback', feedbackRoutes);

// Mounted at /api/v1 in app.ts, e.g.: app.use('/api/v1', v1Router)
export default v1Router;
