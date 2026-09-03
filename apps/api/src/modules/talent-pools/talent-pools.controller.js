import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { AppError } from '../../common/errors/AppError.js';
import * as service from './talent-pools.service.js';

function requireCompanyId(req) {
  const companyId = req.workspaceContext?.companyId;
  if (!companyId) throw new AppError('Select a business workspace to continue', 400, { code: 'WORKSPACE_REQUIRED' });
  return companyId;
}

export const listHandler = asyncHandler(async (req, res) => {
  const { status, pool_type } = req.query;
  const result = await service.list(requireCompanyId(req), { status, pool_type });
  res.json({ data: result.items, meta: { total: result.total } });
});

export const getHandler = asyncHandler(async (req, res) => {
  const record = await service.getById(req.params.id, requireCompanyId(req));
  res.json({ data: record });
});

export const createHandler = asyncHandler(async (req, res) => {
  const record = await service.create(requireCompanyId(req), req.body);
  res.status(201).json({ data: record });
});

export const updateHandler = asyncHandler(async (req, res) => {
  const record = await service.update(req.params.id, requireCompanyId(req), req.body);
  res.json({ data: record });
});

export const removeHandler = asyncHandler(async (req, res) => {
  const record = await service.remove(req.params.id, requireCompanyId(req));
  res.json({ data: record });
});

export const addMemberHandler = asyncHandler(async (req, res) => {
  const record = await service.addMember(req.params.id, requireCompanyId(req), req.body);
  res.status(201).json({ data: record });
});

export const removeMemberHandler = asyncHandler(async (req, res) => {
  await service.removeMember(req.params.id, req.params.memberId, requireCompanyId(req));
  res.status(204).send();
});
