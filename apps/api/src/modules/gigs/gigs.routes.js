import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import {
  listPublicHandler,
  listFeaturedHandler,
  getBySlugHandler,
  createHandler,
  updateHandler,
  removeHandler,
} from './gigs.controller.js';

const router = Router();

// Public read surface (Gigs Marketplace + Public Gig pages) — no auth.
router.get('/', listPublicHandler);
router.get('/featured', listFeaturedHandler);
router.get('/:slug', getBySlugHandler);

// Authoring stays authenticated — canonical Gigs domain owns writes.
router.post('/', requireAuth, createHandler);
router.patch('/:id', requireAuth, updateHandler);
router.delete('/:id', requireAuth, removeHandler);

export default router;
