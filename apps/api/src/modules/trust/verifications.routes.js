import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { requirePlatformRole } from '../../common/middleware/requirePlatformRole.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { AppError } from '../../common/errors/AppError.js';
import { getSignedUploadUrl } from '../../storage/s3.js';
import { db } from '../../db/connection.js';
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

router.get('/overview/me', asyncHandler(async (req, res) => {
  res.json({ data: await verifications.getOverview('user', req.user.sub) });
}));

router.get('/overview/:subjectType/:subjectId', asyncHandler(async (req, res) => {
  res.json({ data: await verifications.getOverview(req.params.subjectType, req.params.subjectId) });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { verificationType, claimData } = req.body;

  if (verificationType === 'business') {
    // Business verification is scoped to the active workspace's company (X-Workspace-Id,
    // re-verified server-side against company_members — the header is only a hint) rather
    // than the caller's own account.
    const companyId = req.headers['x-workspace-id'];
    if (!companyId) throw new AppError('An active business workspace is required to start business verification', 422);
    const membership = await db('company_members').where({ company_id: companyId, user_id: req.user.sub }).first().catch(() => null);
    if (!membership) throw new AppError('Forbidden', 403);
    const data = await verifications.startVerification('company', companyId, verificationType, claimData);
    return res.status(201).json({ data });
  }

  // Every other self-service verification type (identity/professional/qualification/
  // employment/email/phone) is always scoped to the caller's own user account.
  const data = await verifications.startVerification('user', req.user.sub, verificationType, claimData);
  res.status(201).json({ data });
}));

async function assertVerificationOwnership(verification, userId) {
  if (verification.subject_type === 'user' && verification.subject_id !== userId) throw new AppError('Forbidden', 403);
  if (verification.subject_type === 'company') {
    const membership = await db('company_members').where({ company_id: verification.subject_id, user_id: userId }).first().catch(() => null);
    if (!membership) throw new AppError('Forbidden', 403);
  }
}

router.post('/:verificationId/upload-url', asyncHandler(async (req, res) => {
  const verification = await db('verifications').where({ id: req.params.verificationId }).first();
  if (!verification) throw new AppError('Verification not found', 404);
  await assertVerificationOwnership(verification, req.user.sub);
  const { filename, contentType } = req.body;
  const key = `trust/verifications/${req.params.verificationId}/${Date.now()}-${filename}`;
  const url = await getSignedUploadUrl({ key, contentType });
  res.json({ data: { key, url } });
}));

router.post('/:verificationId/submit', asyncHandler(async (req, res) => {
  const verification = await db('verifications').where({ id: req.params.verificationId }).first();
  if (!verification) throw new AppError('Verification not found', 404);
  await assertVerificationOwnership(verification, req.user.sub);
  res.json({ data: await verifications.submitVerification(req.params.verificationId, req.user.sub, req.body) });
}));

router.post('/:verificationId/review', requirePlatformRole('super_admin', 'admin', 'moderator'), asyncHandler(async (req, res) => {
  res.json({ data: await verifications.reviewVerification(req.params.verificationId, req.user.sub, req.body) });
}));

router.post('/domain', asyncHandler(async (req, res) => {
  const { subjectType = 'company', subjectId, domain } = req.body;
  if (!domain || !subjectId) throw new AppError('domain and subjectId are required', 422);
  if (subjectType === 'company') {
    const membership = await db('company_members').where({ company_id: subjectId, user_id: req.user.sub }).first().catch(() => null);
    if (!membership) throw new AppError('Forbidden', 403);
  } else if (subjectId !== req.user.sub) {
    throw new AppError('Forbidden', 403);
  }
  res.status(201).json({ data: await verifications.requestDomainVerification(subjectType, subjectId, domain) });
}));

router.post('/domain/:domainVerificationId/check', asyncHandler(async (req, res) => {
  res.json({ data: await verifications.checkDomainVerification(req.params.domainVerificationId, req.body.token) });
}));

export default router;
