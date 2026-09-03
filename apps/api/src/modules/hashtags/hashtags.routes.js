import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import {
  getHashtagHandler,
  listHashtagContentHandler,
  getHashtagInsightsHandler,
  getRelatedHashtagsHandler,
  getTopContributorsHandler,
  followHashtagHandler,
  unfollowHashtagHandler,
} from './hashtags.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/:tag', getHashtagHandler);
router.get('/:tag/content', listHashtagContentHandler);
router.get('/:tag/insights', getHashtagInsightsHandler);
router.get('/:tag/related', getRelatedHashtagsHandler);
router.get('/:tag/contributors', getTopContributorsHandler);
router.post('/:tag/follow', followHashtagHandler);
router.delete('/:tag/follow', unfollowHashtagHandler);

export default router;
