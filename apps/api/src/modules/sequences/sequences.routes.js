import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { requireRecruiterProSeat } from '../../common/middleware/requireRecruiterProSeat.js';
import {
  listHandler,
  getHandler,
  createHandler,
  updateHandler,
  removeHandler,
  addStepHandler,
  reorderStepHandler,
  removeStepHandler,
  enrollHandler,
  listEnrollmentsHandler,
  advanceEnrollmentHandler,
} from './sequences.controller.js';

const router = Router();
router.use(requireAuth, requireRecruiterProSeat);

router.get('/', listHandler);
router.post('/', createHandler);
router.get('/:id', getHandler);
router.patch('/:id', updateHandler);
router.delete('/:id', removeHandler);

router.post('/:id/steps', addStepHandler);
router.patch('/:id/steps/:stepId', reorderStepHandler);
router.delete('/:id/steps/:stepId', removeStepHandler);

router.post('/:id/enrollments', enrollHandler);
router.get('/:id/enrollments', listEnrollmentsHandler);
router.post('/enrollments/:enrollmentId/advance', advanceEnrollmentHandler);

export default router;
