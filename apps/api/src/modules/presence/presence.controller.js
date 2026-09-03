import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { AppError } from '../../common/errors/AppError.js';
import * as service from './presence.service.js';

export const getPresenceHandler = asyncHandler(async (req, res) => {
  const raw = req.query.userIds;
  if (!raw) throw new AppError('userIds is required', 422);
  const userIds = String(raw)
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  const data = await service.getPresence(userIds);
  res.json({ data });
});
