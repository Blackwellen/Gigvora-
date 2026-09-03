import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { resolveWorkspaceContext } from '../../common/middleware/workspaceContext.js';
import {
  getTreeHandler,
  getMegaMenuHandler,
  getPreferencesHandler,
  updatePreferencesHandler,
  pinHandler,
  unpinHandler,
} from './navigation.controller.js';

const router = Router();

router.use(requireAuth, resolveWorkspaceContext);

router.get('/', getTreeHandler);
router.get('/mega-menu/:key', getMegaMenuHandler);
router.get('/preferences', getPreferencesHandler);
router.patch('/preferences', updatePreferencesHandler);
router.post('/pin', pinHandler);
router.post('/unpin', unpinHandler);

export default router;
