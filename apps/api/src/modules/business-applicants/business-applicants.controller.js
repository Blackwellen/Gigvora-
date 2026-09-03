import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './business-applicants.service.js';

export const listHandler = asyncHandler(async (req, res) => {
  const { job_id, status, q, department_id, limit, offset } = req.query;
  const result = await service.list(req.workspaceContext?.companyId, {
    job_id,
    status,
    q,
    department_id,
    limit: limit ? Number(limit) : undefined,
    offset: offset ? Number(offset) : undefined,
  });
  res.json({ data: result.items, meta: { total: result.total } });
});

export const summaryHandler = asyncHandler(async (req, res) => {
  const result = await service.summary(req.workspaceContext?.companyId);
  res.json({ data: result });
});

export const getHandler = asyncHandler(async (req, res) => {
  const record = await service.getById(req.params.id, req.workspaceContext?.companyId);
  res.json({ data: record });
});
