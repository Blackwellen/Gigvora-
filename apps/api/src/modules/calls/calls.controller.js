import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { AppError } from '../../common/errors/AppError.js';
import * as service from './callRoom.service.js';

export const joinHandler = asyncHandler(async (req, res) => {
  const { conversationId, meetingId } = req.body;
  if (!conversationId && !meetingId) throw new AppError('conversationId or meetingId is required', 422);
  const data = await service.joinCall(req.user.sub, { conversationId, meetingId });
  res.json({ data });
});

export const leaveHandler = asyncHandler(async (req, res) => {
  await service.leaveCall(req.user.sub, req.params.id);
  res.status(204).send();
});

export const endHandler = asyncHandler(async (req, res) => {
  await service.endCallForHost(req.user.sub, req.params.id);
  res.status(204).send();
});

export const getInfoHandler = asyncHandler(async (req, res) => {
  const data = await service.getCallInfo(req.user.sub, req.params.id);
  res.json({ data });
});
