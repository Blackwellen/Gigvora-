import { Router } from 'express';
import { requireAuth, requireRole } from '../../common/middleware/auth.js';
import { listPublicHandler, getBySlugHandler, createHandler } from './webinars.controller.js';

const router = Router();

// Public read surface — no auth required to browse published sessions.
router.get('/', listPublicHandler);
router.get('/:slug', getBySlugHandler);

// Editorial content: only admins publish webinar sessions.
router.post('/', requireAuth, requireRole('admin'), createHandler);

export default router;
