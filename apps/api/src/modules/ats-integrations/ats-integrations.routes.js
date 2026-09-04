import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { requireRecruiterProSeat } from '../../common/middleware/requireRecruiterProSeat.js';
import {
  listConnectionsHandler,
  createConnectionHandler,
  disconnectHandler,
  listFieldMappingsHandler,
  updateFieldMappingHandler,
  listSyncRunsHandler,
  triggerSyncHandler,
} from './ats-integrations.controller.js';

const router = Router();
router.use(requireAuth, requireRecruiterProSeat);

router.get('/connections', listConnectionsHandler);
router.post('/connections', createConnectionHandler);
router.post('/connections/:id/disconnect', disconnectHandler);
router.get('/connections/:id/field-mappings', listFieldMappingsHandler);
router.patch('/connections/:id/field-mappings/:mappingId', updateFieldMappingHandler);
router.get('/connections/:id/sync-runs', listSyncRunsHandler);
router.post('/connections/:id/sync-runs', triggerSyncHandler);

export default router;
