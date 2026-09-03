import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { AppError } from '../../common/errors/AppError.js';
import * as service from './meetings.service.js';
import * as meetingsAi from './meetingsAi.service.js';

export const listHandler = asyncHandler(async (req, res) => {
  const data = await service.listMeetings(req.user.sub, { from: req.query.from, to: req.query.to, limit: Number(req.query.limit) || undefined });
  res.json({ data });
});

export const createHandler = asyncHandler(async (req, res) => {
  const data = await service.createMeeting(req.user.sub, req.body);
  res.status(201).json({ data });
});

export const getHandler = asyncHandler(async (req, res) => {
  const data = await service.getMeetingDetail(req.user.sub, req.params.id);
  res.json({ data });
});

export const updateHandler = asyncHandler(async (req, res) => {
  const data = await service.updateMeeting(req.user.sub, req.params.id, req.body);
  res.json({ data });
});

export const cancelHandler = asyncHandler(async (req, res) => {
  const data = await service.cancelMeeting(req.user.sub, req.params.id);
  res.json({ data });
});

export const respondHandler = asyncHandler(async (req, res) => {
  if (!req.body.attendanceStatus) throw new AppError('attendanceStatus is required', 422);
  const data = await service.respondToInvite(req.user.sub, req.params.id, req.body.attendanceStatus);
  res.json({ data });
});

export const addNoteHandler = asyncHandler(async (req, res) => {
  const data = await service.addNote(req.user.sub, req.params.id, req.body.body);
  res.status(201).json({ data });
});

export const addActionItemHandler = asyncHandler(async (req, res) => {
  const data = await service.addActionItem(req.user.sub, req.params.id, req.body);
  res.status(201).json({ data });
});

export const updateActionItemHandler = asyncHandler(async (req, res) => {
  const data = await service.updateActionItem(req.user.sub, req.params.id, req.params.actionItemId, req.body);
  res.json({ data });
});

export const suggestSlotsHandler = asyncHandler(async (req, res) => {
  const { userIds = [], earliestStart, durationMinutes } = req.body;
  if (!earliestStart) throw new AppError('earliestStart is required', 422);
  const data = await service.suggestAvailableSlots(Array.from(new Set([req.user.sub, ...userIds])), { earliestStart, durationMinutes });
  res.json({ data: { slots: data } });
});

export const detectConflictsHandler = asyncHandler(async (req, res) => {
  const { userIds = [], startsAt, endsAt } = req.body;
  if (!startsAt || !endsAt) throw new AppError('startsAt and endsAt are required', 422);
  const data = await service.detectConflicts(Array.from(new Set([req.user.sub, ...userIds])), startsAt, endsAt);
  res.json({ data: { conflicts: data } });
});

export const suggestAgendaHandler = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  if (!title) throw new AppError('title is required', 422);
  const data = await meetingsAi.suggestAgendaItems(title, description);
  res.json({ data });
});
