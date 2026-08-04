import { Router } from 'express';
import * as doctorController from '../controllers/doctor.controller';

const router = Router();

// Public — browsing/searching available doctors doesn't need auth, matching
// the already-public GET /ai/doctor/:diagnosis lookup. Deliberately
// separate from doctor.routes.ts (mounted at /doctor, singular), which is
// entirely behind authorize('doctor') for a doctor's own profile.
router.get('/', doctorController.listDoctors);

export default router;
