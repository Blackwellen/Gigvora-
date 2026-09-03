import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../../common/middleware/auth.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { AppError } from '../../common/errors/AppError.js';
import * as disputes from './disputes.service.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  const { objectType, objectId } = req.query;
  if (!objectType || !objectId) throw new AppError('objectType and objectId are required', 422);
  const data = await disputes.listDisputesForObject(objectType, objectId, req.user.sub);
  res.json({ data });
}));

router.post('/', asyncHandler(async (req, res) => {
  const data = await disputes.openDispute(req.user.sub, req.body);
  res.status(201).json({ data });
}));

router.get('/:disputeId', asyncHandler(async (req, res) => {
  const data = await disputes.getDispute(req.params.disputeId, req.user.sub);
  res.json({ data });
}));

router.post('/:disputeId/transition', asyncHandler(async (req, res) => {
  const data = await disputes.transitionDispute(req.params.disputeId, req.user.sub, req.body);
  res.json({ data });
}));

router.get('/:disputeId/evidence', asyncHandler(async (req, res) => {
  const data = await disputes.listEvidence(req.params.disputeId, req.user.sub);
  res.json({ data });
}));

router.post('/:disputeId/evidence', upload.single('file'), asyncHandler(async (req, res) => {
  const data = await disputes.submitEvidence(req.params.disputeId, req.user.sub, { description: req.body.description, file: req.file });
  res.status(201).json({ data });
}));

router.get('/:disputeId/messages', asyncHandler(async (req, res) => {
  const data = await disputes.listMessages(req.params.disputeId, req.user.sub);
  res.json({ data });
}));

router.post('/:disputeId/messages', asyncHandler(async (req, res) => {
  const data = await disputes.postMessage(req.params.disputeId, req.user.sub, req.body.body);
  res.status(201).json({ data });
}));

export default router;
