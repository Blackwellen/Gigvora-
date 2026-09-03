import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { AppError } from '../../common/errors/AppError.js';
import * as service from './business-members.service.js';

function requireCompanyId(req) {
  const companyId = req.workspaceContext?.companyId;
  if (!companyId) throw new AppError('Select a business workspace to continue', 400, { code: 'WORKSPACE_REQUIRED' });
  return companyId;
}

export const listHandler = asyncHandler(async (req, res) => {
  const companyId = requireCompanyId(req);
  const { role, status, q } = req.query;
  const result = await service.list(companyId, { role, status, q });
  res.json({ data: result.items, meta: { total: result.total } });
});

export const inviteHandler = asyncHandler(async (req, res) => {
  const companyId = requireCompanyId(req);
  const record = await service.invite(companyId, req.body);
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
