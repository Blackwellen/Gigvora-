import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { createHandler, updateHandler, getHandler, listMineHandler, publishHandler, removeHandler } from './sessions.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/mine', listMineHandler);
router.post('/', createHandler);
router.get('/:id', getHandler);
router.patch('/:id', updateHandler);
router.post('/:id/publish', publishHandler);
router.delete('/:id', removeHandler);

export default router;
