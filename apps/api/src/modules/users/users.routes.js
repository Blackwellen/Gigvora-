import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import {
  listHandler,
  getHandler,
  getMeHandler,
  getMeEntitlementsHandler,
  createHandler,
  updateHandler,
  removeHandler,
  followHandler,
  unfollowHandler,
  followStatusHandler,
} from './users.controller.js';

const router = Router();

router.get('/', listHandler);
router.get('/me', requireAuth, getMeHandler);
router.get('/me/entitlements', requireAuth, getMeEntitlementsHandler);
router.get('/:id', getHandler);
router.post('/', requireAuth, createHandler);
router.patch('/:id', requireAuth, updateHandler);
router.delete('/:id', requireAuth, removeHandler);

router.get('/:id/follow', requireAuth, followStatusHandler);
router.post('/:id/follow', requireAuth, followHandler);
router.delete('/:id/follow', requireAuth, unfollowHandler);

export default router;
