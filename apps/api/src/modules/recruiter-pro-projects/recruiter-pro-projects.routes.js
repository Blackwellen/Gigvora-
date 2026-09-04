import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { requireRecruiterProSeat } from '../../common/middleware/requireRecruiterProSeat.js';
import { getAutomationStatusHandler, listSlaBreachesHandler, getAtsSyncHandler } from './recruiter-pro-projects.controller.js';

const router = Router();
router.use(requireAuth, requireRecruiterProSeat);

router.get('/sla-breaches', listSlaBreachesHandler);
router.get('/:projectId/automation-status', getAutomationStatusHandler);
router.get('/:projectId/ats-sync', getAtsSyncHandler);

export default router;
