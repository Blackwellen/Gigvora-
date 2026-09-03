import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { AppError } from '../../common/errors/AppError.js';
import * as service from './departments.service.js';

function requireCompanyId(req) {
  const companyId = req.workspaceContext?.companyId;
  if (!companyId) throw new AppError('Select a business workspace to continue', 400, { code: 'WORKSPACE_REQUIRED' });
  return companyId;
}

export const listHandler = asyncHandler(async (req, res) => {
  const companyId = requireCompanyId(req);
  const result = await service.list(companyId, { status: req.query.status });
  res.json({ data: result.items, meta: { total: result.total } });
});

export const getHandler = asyncHandler(async (req, res) => {
  const companyId = requireCompanyId(req);
  const record = await service.getById(companyId, req.params.id);
  res.json({ data: record });
});

export const createHandler = asyncHandler(async (req, res) => {
  const companyId = requireCompanyId(req);
  const record = await service.create(companyId, req.body);
  res.status(201).json({ data: record });
});

export const updateHandler = asyncHandler(async (req, res) => {
  const companyId = requireCompanyId(req);
  const record = await service.update(companyId, req.params.id, req.body);
  res.json({ data: record });
});

export const removeHandler = asyncHandler(async (req, res) => {
  const companyId = requireCompanyId(req);
  await service.remove(companyId, req.params.id);
  res.status(204).send();
});
