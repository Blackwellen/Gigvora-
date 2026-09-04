import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './team-collaboration.service.js';

export const listEventsHandler = asyncHandler(async (req, res) => {
  const rows = await service.listEvents(req.user.sub, { projectId: req.query.projectId });
  res.json({ data: rows, meta: { total: rows.length } });
});

export const postCommentHandler = asyncHandler(async (req, res) => {
  const row = await service.postComment(req.user.sub, req.body);
  res.status(201).json({ data: row });
});
