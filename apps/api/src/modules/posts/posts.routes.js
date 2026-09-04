import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../../common/middleware/auth.js';
import {
  feedRecommendationsHandler,
  followingFeedSummaryHandler,
  networkFeedSummaryHandler,
  listFeedHandler,
  getPostHandler,
  getOwnedPostHandler,
  createPostHandler,
  updatePostHandler,
  deletePostHandler,
  reactHandler,
  unreactHandler,
  listCommentsHandler,
  createCommentHandler,
  updateCommentHandler,
  deleteCommentHandler,
  sharePostHandler,
  reactToCommentHandler,
  unreactToCommentHandler,
  shareCommentHandler,
  searchGifsHandler,
  savePostHandler,
  unsavePostHandler,
  votePollHandler,
  getPollHandler,
  closePollHandler,
  uploadAttachmentHandler,
  linkPreviewHandler,
  notInterestedHandler,
  hideAuthorHandler,
  hideTopicHandler,
  listHiddenPreferencesHandler,
  recordImpressionsHandler,
  getPostAnalyticsHandler,
  exportPostAnalyticsHandler,
  suggestTopicsHandler,
} from './posts.controller.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const router = Router();
router.use(requireAuth);

router.get('/', listFeedHandler);
router.get('/recommendations', feedRecommendationsHandler);
router.get('/following-summary', followingFeedSummaryHandler);
router.get('/network-summary', networkFeedSummaryHandler);
router.post('/attachments', upload.single('file'), uploadAttachmentHandler);
router.post('/link-preview', linkPreviewHandler);
router.post('/topics/suggest', suggestTopicsHandler);

router.get('/preferences/hidden', listHiddenPreferencesHandler);
router.post('/preferences/not-interested', notInterestedHandler);
router.post('/preferences/hide-author', hideAuthorHandler);
router.post('/preferences/hide-topic', hideTopicHandler);

router.post('/posts', createPostHandler);
router.get('/posts/:id', getPostHandler);
router.get('/posts/:id/owned', getOwnedPostHandler);
router.patch('/posts/:id', updatePostHandler);
router.delete('/posts/:id', deletePostHandler);

router.post('/posts/:id/reactions', reactHandler);
router.delete('/posts/:id/reactions', unreactHandler);

router.get('/posts/:id/comments', listCommentsHandler);
router.post('/posts/:id/comments', createCommentHandler);
router.patch('/comments/:commentId', updateCommentHandler);
router.delete('/comments/:commentId', deleteCommentHandler);
router.post('/comments/:commentId/reactions', reactToCommentHandler);
router.delete('/comments/:commentId/reactions', unreactToCommentHandler);
router.post('/comments/:commentId/share', shareCommentHandler);
router.get('/gifs/search', searchGifsHandler);

router.post('/posts/:id/share', sharePostHandler);
router.post('/posts/:id/save', savePostHandler);
router.delete('/posts/:id/save', unsavePostHandler);

// Batched impression recording (array of post IDs) as well as a
// single-post variant, both wired to the same handler.
router.post('/posts/impressions', recordImpressionsHandler);
router.post('/posts/:id/impressions', recordImpressionsHandler);
router.get('/posts/:id/analytics', getPostAnalyticsHandler);
router.get('/posts/:id/analytics/export', exportPostAnalyticsHandler);

router.post('/polls/:pollId/vote', votePollHandler);
router.get('/polls/:pollId', getPollHandler);
router.post('/polls/:pollId/close', closePollHandler);

export default router;
