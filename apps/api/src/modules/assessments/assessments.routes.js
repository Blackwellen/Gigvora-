import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { getHandler, createHandler, assignHandler, submitHandler, byApplicationHandler } from './assessments.controller.js';

const router = Router();
router.use(requireAuth);

// Fixed sub-paths before the ':id' catch-all.
router.get('/by-application/:applicationId', byApplicationHandler);
router.post('/assignments/:assignmentId/submit', submitHandler);

router.get('/:id', getHandler);
router.post('/', createHandler);
router.post('/:id/assign', assignHandler);

export default router;
