import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './messagingSettings.service.js';

export const getHandler = asyncHandler(async (req, res) => {
  const data = await service.getMessagingSettings(req.user.sub);
  res.json({ data });
});

export const updateHandler = asyncHandler(async (req, res) => {
  const data = await service.updateMessagingSettings(req.user.sub, req.body || {});
  res.json({ data });
});
