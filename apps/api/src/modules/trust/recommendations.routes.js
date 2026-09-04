import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as recommendations from './recommendations.service.js';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  res.json({ data: await recommendations.listRecommendations({ userId: req.user.sub, mode: req.query.mode, status: req.query.status }) });
}));

router.get('/requests', asyncHandler(async (req, res) => {
  res.json({ data: await recommendations.listMyRequests(req.user.sub) });
}));

router.post('/requests', asyncHandler(async (req, res) => {
  const data = await recommendations.requestRecommendation(req.user.sub, req.body);
  res.status(201).json({ data });
}));

router.post('/', asyncHandler(async (req, res) => {
  const data = await recommendations.writeRecommendation(req.user.sub, req.body);
  res.status(201).json({ data });
}));

router.patch('/:recommendationId/visibility', asyncHandler(async (req, res) => {
  const data = await recommendations.setVisibility(req.params.recommendationId, req.user.sub, req.body.visibility);
  res.json({ data });
}));

export default router;
