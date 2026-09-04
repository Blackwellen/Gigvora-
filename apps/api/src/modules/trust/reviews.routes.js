import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { requirePlatformRole } from '../../common/middleware/requirePlatformRole.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as reviews from './reviews.service.js';

const router = Router();
router.use(requireAuth);

router.get('/eligible', asyncHandler(async (req, res) => {
  res.json({ data: await reviews.listEligibleInteractions(req.user.sub) });
}));

router.get('/', asyncHandler(async (req, res) => {
  const { mode, subjectProfileId, rating, status, sort, limit, cursor } = req.query;
  res.json(await reviews.listReviews({
    viewerId: req.user.sub,
    mode,
    subjectProfileId,
    rating,
    status,
    sort,
    limit: limit ? Number(limit) : 20,
    cursor,
  }));
}));

router.post('/', asyncHandler(async (req, res) => {
  const data = await reviews.submitReview(req.user.sub, req.body);
  res.status(201).json({ data });
}));

router.get('/:reviewId', asyncHandler(async (req, res) => {
  res.json({ data: await reviews.getReview(req.params.reviewId, req.user.sub) });
}));

router.patch('/:reviewId', asyncHandler(async (req, res) => {
  res.json({ data: await reviews.editReview(req.params.reviewId, req.user.sub, req.body) });
}));

router.post('/:reviewId/helpful', asyncHandler(async (req, res) => {
  res.json({ data: await reviews.voteHelpful(req.params.reviewId, req.user.sub, req.body.isHelpful !== false) });
}));

router.post('/:reviewId/respond', asyncHandler(async (req, res) => {
  const data = await reviews.respondToReview(req.params.reviewId, req.user.sub, req.body.responseText);
  res.status(201).json({ data });
}));

router.post('/:reviewId/remove', requirePlatformRole('super_admin', 'admin', 'moderator'), asyncHandler(async (req, res) => {
  await reviews.removeReview(req.params.reviewId, req.user.sub, req.body.reasonCode);
  res.json({ data: { removed: true } });
}));

router.post('/:reviewId/restore', requirePlatformRole('super_admin', 'admin', 'moderator'), asyncHandler(async (req, res) => {
  await reviews.restoreReview(req.params.reviewId, req.user.sub);
  res.json({ data: { restored: true } });
}));

export default router;
