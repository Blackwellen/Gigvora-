import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { requirePlatformRole } from '../../common/middleware/requirePlatformRole.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as overview from './overview.service.js';
import { db } from '../../db/connection.js';

const router = Router();
router.use(requireAuth);

router.get('/me', asyncHandler(async (req, res) => {
  res.json({ data: await overview.getTrustOverview('profile', req.user.sub) });
}));

router.get('/:subjectId/review-integrity', asyncHandler(async (req, res) => {
  res.json({ data: await overview.getReviewIntegritySummary(req.params.subjectId) });
}));

// §74 — restricted platform-facing rollup, gated separately from the user-facing overview.
// Registered before the generic /:subjectType/:subjectId route below so it isn't shadowed.
router.get('/internal/analytics', requirePlatformRole('super_admin', 'admin', 'moderator'), asyncHandler(async (req, res) => {
  const [reportVolume, actionRate, appealOverturn, verificationSuccess] = await Promise.all([
    db('reports').count({ count: '*' }).first(),
    db('case_decisions').count({ count: '*' }).first(),
    db('appeals').whereIn('status', ['upheld', 'partially_upheld']).count({ count: '*' }).first(),
    db('verifications').where({ status: 'verified' }).count({ count: '*' }).first(),
  ]);
  const totalAppeals = await db('appeals').whereIn('status', ['upheld', 'partially_upheld', 'denied']).count({ count: '*' }).first();
  res.json({
    data: {
      reportVolume: Number(reportVolume?.count || 0),
      decisionVolume: Number(actionRate?.count || 0),
      appealOverturnRate: Number(totalAppeals?.count || 0) ? Number(appealOverturn?.count || 0) / Number(totalAppeals.count) : null,
      verifiedCount: Number(verificationSuccess?.count || 0),
    },
  });
}));

router.get('/:subjectType/:subjectId', asyncHandler(async (req, res) => {
  res.json({ data: await overview.getTrustOverview(req.params.subjectType, req.params.subjectId) });
}));

export default router;
