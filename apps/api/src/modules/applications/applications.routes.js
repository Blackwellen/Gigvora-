import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { listHandler, listMineHandler, getHandler, createHandler, updateHandler, removeHandler } from './applications.controller.js';
import { requestUploadUrlHandler, completeUploadHandler } from './resumeUpload.controller.js';

const router = Router();

// Resume upload — request a signed PUT URL for a server-generated key, then
// verify the object landed in storage before trusting the client's word.
// Scoped to the authenticated user (no separate ownership check needed: a
// user can only ever upload their own resume), so no jobId/applicationId
// param — full paths are POST /applications/resume/upload-url and
// POST /applications/resume/complete.
router.post('/resume/upload-url', requireAuth, requestUploadUrlHandler);
router.post('/resume/complete', requireAuth, completeUploadHandler);

router.get('/', requireAuth, listHandler);
// Must be registered before /:id — otherwise Express would match "mine" as an :id param.
router.get('/mine', requireAuth, listMineHandler);
router.get('/:id', requireAuth, getHandler);
router.post('/', requireAuth, createHandler);
router.patch('/:id', requireAuth, updateHandler);
router.delete('/:id', requireAuth, removeHandler);

export default router;
