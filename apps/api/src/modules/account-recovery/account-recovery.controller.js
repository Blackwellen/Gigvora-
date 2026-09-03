import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './account-recovery.service.js';

export const startHandler = asyncHandler(async (req, res) => {
  const result = await service.startRecovery(req.body, req);
  res.status(201).json(result);
});

export const getHandler = asyncHandler(async (req, res) => {
  const result = await service.getRecoveryRequest({ requestId: req.params.id });
  res.json(result);
});

export const challengeHandler = asyncHandler(async (req, res) => {
  const result = await service.beginChallenge({ requestId: req.params.id, method: req.body.method });
  res.status(201).json(result);
});

export const verifyHandler = asyncHandler(async (req, res) => {
  const result = await service.verifyChallenge({ requestId: req.params.id, challengeId: req.body.challengeId, code: req.body.code });
  res.json(result);
});

export const completeHandler = asyncHandler(async (req, res) => {
  const result = await service.completeRecovery({ requestId: req.params.id, newPassword: req.body.newPassword }, req);
  res.json(result);
});
