import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { getHandler, byApplicationHandler, createHandler, updateHandler, approveHandler } from './offers.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/by-application/:applicationId', byApplicationHandler);

router.get('/:id', getHandler);
router.post('/', createHandler);
router.patch('/:id', updateHandler);
router.post('/:id/approve', approveHandler);

export default router;
