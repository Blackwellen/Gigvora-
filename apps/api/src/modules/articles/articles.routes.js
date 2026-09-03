import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import {
  createArticleHandler,
  getArticleHandler,
  getOwnedArticleHandler,
  updateArticleHandler,
  getRelatedArticlesHandler,
} from './articles.controller.js';

const router = Router();
router.use(requireAuth);

router.post('/', createArticleHandler);
router.get('/:postId', getArticleHandler);
router.get('/:postId/owned', getOwnedArticleHandler);
router.patch('/:postId', updateArticleHandler);
router.get('/:postId/related', getRelatedArticlesHandler);

export default router;
