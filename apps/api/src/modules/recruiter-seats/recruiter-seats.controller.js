import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './recruiter-seats.service.js';

export const getMySeatHandler = asyncHandler(async (req, res) => {
  const seat = await service.getMySeat(req.user.sub);
  res.json({ data: seat });
});
