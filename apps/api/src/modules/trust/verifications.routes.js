import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { requirePlatformRole } from '../../common/middleware/requirePlatformRole.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { AppError } from '../../common/errors/AppError.js';
import { getSignedUploadUrl } from '../../storage/s3.js';
import * as verifications from './verifications.service.js';

// NOTE: the provider webhook endpoint is NOT mounted on this router. Like the Stripe webhook
// (see app.js), it needs the raw request body for HMAC signature verification, which is only
// available before the global express.json() parser runs. It is registered directly in
// app.js as `POST /api/v1/webhooks/trust-verification` with express.raw() — see
// `trustVerificationWebhookHandler` exported below for that handler.
export async function trustVerificationWebhookHandler(req, res) {
  const rawBody = req.body?.toString('utf8') || '';
  const payload = rawBody ? JSON.parse(rawBody) : {};
  const result = await verifications.handleProviderWebhook({
    provider: payload.provider,
    eventId: payload.eventId,
    signature: req.headers['x-trust-signature'],
    rawBody,
    verificationId: payload.verificationId,
    eventType: payload.eventType,
    payload: payload.data,
  });
  res.json({ data: result });
}

const router = Router();
router.use(requireAuth);

router.get('/overview/:subjectType/:subjectId', asyncHandler(async (req, res) => {
  res.json({ data: await verifications.getOverview(req.params.subjectType, req.params.subjectId) });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { subjectType = 'profile', subjectId = req.user.sub, verificationType, claimData } = req.body;
  if (subjectId !== req.user.sub) throw new AppError('Forbidden', 403);
  const data = await verifications.startVerification(subjectType, subjectId, verificationType, claimData);
  res.status(201).json({ data });
}));

router.post('/:verificationId/upload-url', asyncHandler(async (req, res) => {
  const { filename, contentType } = req.body;
  const key = `trust/verifications/${req.params.verificationId}/${Date.now()}-${filename}`;
  const url = await getSignedUploadUrl({ key, contentType });
  res.json({ data: { key, url } });
}));

router.post('/:verificationId/submit', asyncHandler(async (req, res) => {
  res.json({ data: await verifications.submitVerification(req.params.verificationId, req.user.sub, req.body) });
}));

router.post('/:verificationId/review', requirePlatformRole('super_admin', 'admin', 'moderator'), asyncHandler(async (req, res) => {
  res.json({ data: await verifications.reviewVerification(req.params.verificationId, req.user.sub, req.body) });
}));

router.post('/domain', asyncHandler(async (req, res) => {
  const { subjectType = 'company', subjectId = req.user.sub, domain } = req.body;
  if (!domain) throw new AppError('domain is required', 422);
  res.status(201).json({ data: await verifications.requestDomainVerification(subjectType, subjectId, domain) });
}));

router.post('/domain/:domainVerificationId/check', asyncHandler(async (req, res) => {
  res.json({ data: await verifications.checkDomainVerification(req.params.domainVerificationId, req.body.token) });
}));

export default router;
