import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { requireRecruiterProSeat } from '../../common/middleware/requireRecruiterProSeat.js';
import { listHandler, getHandler, createHandler, updateHandler, removeHandler, useHandler } from './outreach-templates.controller.js';

const router = Router();
router.use(requireAuth, requireRecruiterProSeat);

router.get('/', listHandler);
router.post('/', createHandler);
router.get('/:id', getHandler);
router.patch('/:id', updateHandler);
router.delete('/:id', removeHandler);
router.post('/:id/use', useHandler);

export default router;
