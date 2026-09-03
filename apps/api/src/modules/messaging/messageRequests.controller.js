import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './messageRequests.service.js';

export const listHandler = asyncHandler(async (req, res) => {
  const data = await service.listMessageRequests(req.user.sub, req.query.status || undefined);
  res.json({ data });
});

export const acceptHandler = asyncHandler(async (req, res) => {
  const data = await service.acceptMessageRequest(req.user.sub, req.params.id);
  res.json({ data });
});

export const declineHandler = asyncHandler(async (req, res) => {
  const data = await service.declineMessageRequest(req.user.sub, req.params.id);
  res.json({ data });
});

export const blockHandler = asyncHandler(async (req, res) => {
  const data = await service.blockMessageRequest(req.user.sub, req.params.id);
  res.json({ data });
});

export const spamHandler = asyncHandler(async (req, res) => {
  const data = await service.markSpamMessageRequest(req.user.sub, req.params.id);
  res.json({ data });
});
