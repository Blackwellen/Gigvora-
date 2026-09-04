import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { requirePlatformRole } from '../../common/middleware/requirePlatformRole.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as appeals from './appeals.service.js';

const PLATFORM_ROLES = ['super_admin', 'admin', 'moderator'];
const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  const isStaff = PLATFORM_ROLES.includes(req.user.role);
  if (isStaff && req.query.scope === 'queue') {
    return res.json(await appeals.listQueue({ status: req.query.status, limit: req.query.limit ? Number(req.query.limit) : 25, cursor: req.query.cursor }));
  }
  res.json({ data: await appeals.listMyAppeals(req.user.sub) });
}));

router.post('/', asyncHandler(async (req, res) => {
  const data = await appeals.submitAppeal(req.user.sub, req.body);
  res.status(201).json({ data });
}));

router.get('/:appealId', asyncHandler(async (req, res) => {
  const isStaff = PLATFORM_ROLES.includes(req.user.role);
  res.json({ data: await appeals.getAppeal(req.params.appealId, req.user.sub, isStaff) });
}));

router.post('/:appealId/assign', requirePlatformRole(...PLATFORM_ROLES), asyncHandler(async (req, res) => {
  await appeals.assignReviewer(req.params.appealId, req.body.reviewerId || req.user.sub);
  res.json({ data: { assigned: true } });
}));

router.post('/:appealId/decide', requirePlatformRole(...PLATFORM_ROLES), asyncHandler(async (req, res) => {
  const data = await appeals.decideAppeal(req.params.appealId, req.user.sub, req.body);
  res.json({ data });
}));

export default router;
