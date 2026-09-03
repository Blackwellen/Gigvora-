import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { listPublicHandler, getBySlugHandler, createHandler } from './projects.controller.js';

const router = Router();

// Public read surface — no auth required to browse open projects.
router.get('/', listPublicHandler);
router.get('/:slug', getBySlugHandler);

// Any authenticated user can post a project they own.
router.post('/', requireAuth, createHandler);

export default router;
