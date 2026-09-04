// Speed Networking — see .claude/plans "Speed Networking" for the full phased design.
// Phase 1: host-side session CRUD + wizard only (sessions.routes.js). Participation
// (checkout/check-in/live rounds) and business-cards land in later phases.
import { Router } from 'express';
import sessionsRoutes from './sessions.routes.js';

const router = Router();
router.use('/sessions', sessionsRoutes);

export default router;
