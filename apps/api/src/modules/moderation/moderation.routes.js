import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { requirePlatformRole } from '../../common/middleware/requirePlatformRole.js';
import { listHeldHandler, approveHandler, removeHandler, actionsHandler } from './moderation.controller.js';

// Same platform-staff gate as modules/admin — moderators, admins and
// super_admins may action the queue; customer_service/finance may not.
const router = Router();
router.use(requireAuth, requirePlatformRole('super_admin', 'admin', 'moderator'));

router.get('/queue', listHeldHandler);
router.get('/:objectId/actions', actionsHandler);
router.post('/:objectId/approve', approveHandler);
router.post('/:objectId/remove', removeHandler);

export default router;
