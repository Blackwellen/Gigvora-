import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { AppError } from '../../common/errors/AppError.js';
import * as service from './teams.service.js';

function requireCompanyId(req) {
  const companyId = req.workspaceContext?.companyId;
  if (!companyId) throw new AppError('Select a business workspace to continue', 400, { code: 'WORKSPACE_REQUIRED' });
  return companyId;
}

export const listHandler = asyncHandler(async (req, res) => {
  const companyId = requireCompanyId(req);
  const { department_id, status, q } = req.query;
  const result = await service.list(companyId, { department_id, status, q });
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

export const addMemberHandler = asyncHandler(async (req, res) => {
  const companyId = requireCompanyId(req);
  const record = await service.addMember(companyId, req.params.id, req.body);
  res.status(201).json({ data: record });
});

export const updateMemberHandler = asyncHandler(async (req, res) => {
  const companyId = requireCompanyId(req);
  const record = await service.updateMember(companyId, req.params.id, req.params.memberId, req.body);
  res.json({ data: record });
});

export const removeMemberHandler = asyncHandler(async (req, res) => {
  const companyId = requireCompanyId(req);
  await service.removeMember(companyId, req.params.id, req.params.memberId);
  res.status(204).send();
});
