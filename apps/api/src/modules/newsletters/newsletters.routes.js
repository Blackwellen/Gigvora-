import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import {
  createNewsletterHandler,
  getNewsletterHandler,
  subscribeHandler,
  unsubscribeHandler,
  listIssuesHandler,
  createIssueHandler,
  getIssueHandler,
  getSubscriberGrowthHandler,
} from './newsletters.controller.js';

const router = Router();
router.use(requireAuth);

router.post('/', createNewsletterHandler);
router.get('/issues/:issueId', getIssueHandler);
router.get('/:idOrSlug', getNewsletterHandler);
router.post('/:id/subscribe', subscribeHandler);
router.delete('/:id/subscribe', unsubscribeHandler);
router.get('/:id/issues', listIssuesHandler);
router.post('/:id/issues', createIssueHandler);
router.get('/:id/subscriber-growth', getSubscriberGrowthHandler);

export default router;
