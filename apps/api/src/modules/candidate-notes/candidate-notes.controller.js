import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { AppError } from '../../common/errors/AppError.js';
import * as service from './candidate-notes.service.js';

export const listHandler = asyncHandler(async (req, res) => {
  if (!req.query.candidateId) throw new AppError('candidateId is required', 422);
  const rows = await service.list(req.user.sub, req.query.candidateId);
  res.json({ data: rows, meta: { total: rows.length } });
});

export const createHandler = asyncHandler(async (req, res) => {
  const row = await service.create(req.user.sub, req.body);
  res.status(201).json({ data: row });
});

export const updateHandler = asyncHandler(async (req, res) => {
  const row = await service.update(req.user.sub, req.params.id, req.body);
  res.json({ data: row });
});

export const removeHandler = asyncHandler(async (req, res) => {
  await service.remove(req.user.sub, req.params.id);
  res.status(204).send();
});
