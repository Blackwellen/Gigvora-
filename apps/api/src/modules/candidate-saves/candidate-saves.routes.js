import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { requireRecruiterSeat } from '../../common/middleware/recruiterSeat.js';
import { listHandler, saveHandler, updateHandler, removeHandler } from './candidate-saves.controller.js';

const router = Router();
router.use(requireAuth, requireRecruiterSeat);

router.get('/', listHandler);
router.post('/', saveHandler);
router.patch('/:id', updateHandler);
router.delete('/:id', removeHandler);

export default router;
