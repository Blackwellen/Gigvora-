import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { requirePlatformRole } from '../../common/middleware/requirePlatformRole.js';
import { contextHandler } from './admin.controller.js';

const PLATFORM_ROLES = ['super_admin', 'admin', 'moderator', 'customer_service', 'finance'];

const router = Router();
router.use(requireAuth, requirePlatformRole(...PLATFORM_ROLES));

router.get('/context', contextHandler);

export default router;
