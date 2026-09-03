import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { listHandler } from './activity.controller.js';

const router = Router();
router.get('/', requireAuth, listHandler);

export default router;
