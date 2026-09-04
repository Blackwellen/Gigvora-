import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { getSignedUploadUrl } from '../../storage/s3.js';
import * as reports from './reports.service.js';

const router = Router();
router.use(requireAuth);

router.get('/reasons', asyncHandler(async (req, res) => {
  res.json({ data: await reports.listReasons() });
}));

router.get('/', asyncHandler(async (req, res) => {
  res.json({ data: await reports.listMyReports(req.user.sub) });
}));

router.post('/', asyncHandler(async (req, res) => {
  const data = await reports.submitReport(req.user.sub, req.body);
  res.status(201).json({ data });
}));

router.post('/evidence-upload-url', asyncHandler(async (req, res) => {
  const { filename, contentType } = req.body;
  const key = `trust/reports/${req.user.sub}/${Date.now()}-${filename}`;
  const url = await getSignedUploadUrl({ key, contentType });
  res.json({ data: { key, url } });
}));

export default router;
