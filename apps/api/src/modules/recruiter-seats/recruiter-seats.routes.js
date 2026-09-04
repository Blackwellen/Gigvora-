import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { getMySeatHandler } from './recruiter-seats.controller.js';

const router = Router();
router.use(requireAuth);

// Intentionally NOT gated by requireRecruiterSeat — this is the endpoint the
// frontend uses to find out whether the caller HAS a seat at all.
router.get('/me', getMySeatHandler);

export default router;
