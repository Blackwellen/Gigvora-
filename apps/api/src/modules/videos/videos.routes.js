import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import {
  listPublicHandler,
  listMineHandler,
  listFeaturedHandler,
  getBySlugHandler,
  trackViewHandler,
  createHandler,
  updateHandler,
  removeHandler,
} from './videos.controller.js';

const router = Router();

router.get('/', listPublicHandler);
router.get('/mine', requireAuth, listMineHandler);
router.get('/featured', listFeaturedHandler);
router.get('/:slug', getBySlugHandler);
router.post('/:slug/view', trackViewHandler);

router.post('/', requireAuth, createHandler);
router.patch('/:id', requireAuth, updateHandler);
router.delete('/:id', requireAuth, removeHandler);

export default router;
