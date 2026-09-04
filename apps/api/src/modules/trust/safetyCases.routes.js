import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { requirePlatformRole } from '../../common/middleware/requirePlatformRole.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as cases from './safetyCases.service.js';

const router = Router();
router.use(requireAuth, requirePlatformRole('super_admin', 'admin', 'moderator'));

router.get('/kpis', asyncHandler(async (req, res) => {
  res.json({ data: await cases.getCaseKpis(req.user.sub) });
}));

router.get('/', asyncHandler(async (req, res) => {
  const { status, severity, assigneeId, caseType, queue, limit, cursor } = req.query;
  res.json(await cases.listCases({ status, severity, assigneeId, caseType, queue, viewerId: req.user.sub, limit: limit ? Number(limit) : 25, cursor }));
}));

router.post('/', asyncHandler(async (req, res) => {
  const data = await cases.createCase(req.body);
  res.status(201).json({ data });
}));

router.get('/:caseId', asyncHandler(async (req, res) => {
  res.json({ data: await cases.getCase(req.params.caseId) });
}));

router.post('/:caseId/transition', asyncHandler(async (req, res) => {
  await cases.transitionCase(req.params.caseId, req.user.sub, req.body.toStatus, req.body.reason);
  res.json({ data: { transitioned: true } });
}));

router.post('/:caseId/assign', asyncHandler(async (req, res) => {
  await cases.assignCase(req.params.caseId, req.user.sub, req.body);
  res.json({ data: { assigned: true } });
}));

router.post('/:caseId/notes', asyncHandler(async (req, res) => {
  const data = await cases.addNote(req.params.caseId, req.user.sub, req.body.body);
  res.status(201).json({ data });
}));

router.post('/:caseId/merge', asyncHandler(async (req, res) => {
  await cases.mergeCase(req.params.caseId, req.body.primaryCaseId, req.user.sub);
  res.json({ data: { merged: true } });
}));

router.post('/:caseId/decisions', asyncHandler(async (req, res) => {
  const data = await cases.recordDecision(req.params.caseId, req.user.sub, req.body);
  res.status(201).json({ data });
}));

router.post('/decisions/:decisionId/approve', asyncHandler(async (req, res) => {
  const data = await cases.approveDecision(req.params.decisionId, req.user.sub);
  res.json({ data });
}));

router.post('/enforcement/:actionId/reverse', asyncHandler(async (req, res) => {
  const data = await cases.reverseEnforcement(req.params.actionId, req.user.sub, req.body.reason);
  res.json({ data });
}));

export default router;
