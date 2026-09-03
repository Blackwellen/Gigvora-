import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './jobs.service.js';

export const listHandler = asyncHandler(async (req, res) => {
  const { q, location, work_mode, employment_type, category, seniority, salary_min, salary_max, sort, limit, offset, status } = req.query;
  const result = await service.list({
    q, location, work_mode, employment_type, category, seniority, salary_min, salary_max, sort,
    status: status || 'open',
    limit: limit ? Number(limit) : undefined,
    offset: offset ? Number(offset) : undefined,
  });
  res.json({ data: result.items, meta: { total: result.total } });
});

export const recommendedHandler = asyncHandler(async (req, res) => {
  const result = await service.recommended(req.user.sub, { limit: req.query.limit });
  res.json({ data: result.items, meta: { total: result.total } });
});

export const savedHandler = asyncHandler(async (req, res) => {
  const result = await service.listSaved(req.user.sub, { limit: req.query.limit, offset: req.query.offset });
  res.json({ data: result.items, meta: { total: result.total } });
});

export const saveHandler = asyncHandler(async (req, res) => {
  const result = await service.saveJob(req.params.id, req.user.sub);
  res.status(201).json({ data: result });
});

export const unsaveHandler = asyncHandler(async (req, res) => {
  const result = await service.unsaveJob(req.params.id, req.user.sub);
  res.json({ data: result });
});

export const getHandler = asyncHandler(async (req, res) => {
  const record = await service.getById(req.params.id, { viewerId: req.user?.sub, source: req.query.source });
  res.json({ data: record });
});

export const createHandler = asyncHandler(async (req, res) => {
  const record = await service.create(req.body, { companyId: req.workspaceContext?.companyId, userId: req.user.sub });
  res.status(201).json({ data: record });
});

export const updateHandler = asyncHandler(async (req, res) => {
  const record = await service.update(req.params.id, req.body, { companyId: req.workspaceContext?.companyId });
  res.json({ data: record });
});

export const removeHandler = asyncHandler(async (req, res) => {
  await service.remove(req.params.id, { companyId: req.workspaceContext?.companyId });
  res.status(204).send();
});

export const applicantsHandler = asyncHandler(async (req, res) => {
  const { stage, q, limit, offset } = req.query;
  const result = await service.listApplicants(req.params.id, { stage, q, limit, offset });
  res.json({ data: result.items, meta: { total: result.total } });
});

export const analyticsHandler = asyncHandler(async (req, res) => {
  const result = await service.analytics(req.params.id);
  res.json({ data: result });
});
