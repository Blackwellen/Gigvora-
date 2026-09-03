import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { getPresenceHandler } from './presence.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/', getPresenceHandler);

export default router;
