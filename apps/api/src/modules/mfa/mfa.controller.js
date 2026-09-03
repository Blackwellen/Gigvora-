import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as mfaService from './mfa.service.js';

export const listHandler = asyncHandler(async (req, res) => {
  const methods = await mfaService.listMfaMethods({ userId: req.user.sub });
  res.json({ methods });
});

export const beginTotpHandler = asyncHandler(async (req, res) => {
  const result = await mfaService.beginTotpSetup({ userId: req.user.sub, label: req.body.label });
  res.status(201).json(result);
});

export const verifyTotpHandler = asyncHandler(async (req, res) => {
  const result = await mfaService.verifyTotpSetup({
    userId: req.user.sub,
    methodId: req.body.methodId,
    code: req.body.code,
    deviceLabel: req.body.deviceLabel,
  });
  res.json(result);
});

export const regenerateRecoveryCodesHandler = asyncHandler(async (req, res) => {
  const result = await mfaService.regenerateRecoveryCodes({ userId: req.user.sub, currentPassword: req.body.currentPassword });
  res.json(result);
});

export const removeMethodHandler = asyncHandler(async (req, res) => {
  const result = await mfaService.removeMfaMethod({
    userId: req.user.sub,
    methodId: req.params.methodId,
    currentPassword: req.body.currentPassword,
  });
  res.json(result);
});
