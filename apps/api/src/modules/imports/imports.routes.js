import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { resolveWorkspaceContext } from '../../common/middleware/workspaceContext.js';
import { validate } from '../../common/middleware/validate.js';
import {
  createImportSchema,
  uploadUrlSchema,
  updateMappingsSchema,
  dedupeDecisionSchema,
} from './imports.validators.js';
import {
  createHandler,
  listHandler,
  getHandler,
  statusHandler,
  uploadUrlHandler,
  completeUploadHandler,
  listMappingsHandler,
  updateMappingsHandler,
  listDedupeHandler,
  dedupeDecisionHandler,
  validateHandler,
  commitHandler,
  cancelHandler,
  targetFieldsHandler,
} from './imports.controller.js';

const router = Router();

router.use(requireAuth, resolveWorkspaceContext);

// No :id param — must be registered before /:id so it isn't swallowed by that route.
router.get('/target-fields/:importType', targetFieldsHandler);

router.post('/', validate(createImportSchema), createHandler);
router.get('/', listHandler);
router.get('/:id', getHandler);
router.get('/:id/status', statusHandler);
router.post('/:id/files/upload-url', validate(uploadUrlSchema), uploadUrlHandler);
router.post('/:id/files/:fileId/complete-upload', completeUploadHandler);
router.get('/:id/mappings', listMappingsHandler);
router.patch('/:id/mappings', validate(updateMappingsSchema), updateMappingsHandler);
router.get('/:id/deduplication', listDedupeHandler);
router.post('/:id/deduplication/:matchId/decision', validate(dedupeDecisionSchema), dedupeDecisionHandler);
router.post('/:id/validate', validateHandler);
router.post('/:id/commit', commitHandler);
router.post('/:id/cancel', cancelHandler);

export default router;
