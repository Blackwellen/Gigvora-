import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { getHandler, updateHandler } from './messagingSettings.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/', getHandler);
router.patch('/', updateHandler);

export default router;
