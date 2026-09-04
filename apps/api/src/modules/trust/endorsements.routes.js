import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as endorsements from './endorsements.service.js';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  const subjectProfileId = req.query.subjectProfileId || req.user.sub;
  res.json({ data: await endorsements.listEndorsementsForSubject(subjectProfileId) });
}));

router.post('/', asyncHandler(async (req, res) => {
  const data = await endorsements.endorseSkill(req.user.sub, req.body);
  res.status(201).json({ data });
}));

router.delete('/:endorsementId', asyncHandler(async (req, res) => {
  await endorsements.removeEndorsement(req.params.endorsementId, req.user.sub);
  res.json({ data: { removed: true } });
}));

export default router;
