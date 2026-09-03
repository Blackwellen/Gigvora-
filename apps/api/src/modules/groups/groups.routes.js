import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import {
  listPublicHandler,
  listFeaturedHandler,
  getBySlugHandler,
  createHandler,
  updateHandler,
  removeHandler,
} from './groups.controller.js';

const router = Router();

router.get('/', listPublicHandler);
router.get('/featured', listFeaturedHandler);
router.get('/:slug', getBySlugHandler);

router.post('/', requireAuth, createHandler);
router.patch('/:id', requireAuth, updateHandler);
router.delete('/:id', requireAuth, removeHandler);

export default router;
