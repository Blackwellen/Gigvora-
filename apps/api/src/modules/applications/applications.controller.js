import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './applications.service.js';

export const listHandler = asyncHandler(async (req, res) => {
  const { jobId, applicantId, limit, offset } = req.query;
  const result = await service.list({
    jobId: jobId || undefined,
    applicantId: applicantId || undefined,
    limit: limit ? Number(limit) : undefined,
    offset: offset ? Number(offset) : undefined,
  });
  res.json({ data: result.items, meta: { total: result.total } });
});

export const getHandler = asyncHandler(async (req, res) => {
  const record = await service.getById(req.params.id);
  res.json({ data: record });
});

export const createHandler = asyncHandler(async (req, res) => {
  const record = await service.create(req.body, req.user.sub);
  res.status(201).json({ data: record });
});

export const updateHandler = asyncHandler(async (req, res) => {
  const record = await service.update(req.params.id, req.body);
  res.json({ data: record });
});

export const removeHandler = asyncHandler(async (req, res) => {
  await service.remove(req.params.id);
  res.status(204).send();
});
