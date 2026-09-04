import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { requireRecruiterSeat } from '../../common/middleware/recruiterSeat.js';
import { listHandler, createHandler, updateHandler, removeHandler } from './candidate-notes.controller.js';

const router = Router();
router.use(requireAuth, requireRecruiterSeat);

router.get('/', listHandler);
router.post('/', createHandler);
router.patch('/:id', updateHandler);
router.delete('/:id', removeHandler);

export default router;
