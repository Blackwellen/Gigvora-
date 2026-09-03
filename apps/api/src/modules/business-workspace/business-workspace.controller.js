import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { AppError } from '../../common/errors/AppError.js';
import * as service from './business-workspace.service.js';

function requireCompanyId(req) {
  const companyId = req.workspaceContext?.companyId;
  if (!companyId) throw new AppError('Select a business workspace to continue', 400, { code: 'WORKSPACE_REQUIRED' });
  return companyId;
}

export const getWorkspaceHandler = asyncHandler(async (req, res) => {
  const companyId = requireCompanyId(req);
  const record = await service.getWorkspace(companyId);
  res.json({ data: record });
});

export const updateWorkspaceHandler = asyncHandler(async (req, res) => {
  const companyId = requireCompanyId(req);
  const record = await service.updateWorkspace(companyId, req.workspaceContext.role, req.body);
  res.json({ data: record });
});

export const listRolesHandler = asyncHandler(async (req, res) => {
  const companyId = requireCompanyId(req);
  const result = await service.listRoles(companyId);
  res.json({ data: result.items, meta: { total: result.total } });
});

export const createRoleHandler = asyncHandler(async (req, res) => {
  const companyId = requireCompanyId(req);
  const record = await service.createRole(companyId, req.body);
  res.status(201).json({ data: record });
});

export const updateRoleHandler = asyncHandler(async (req, res) => {
  const companyId = requireCompanyId(req);
  const record = await service.updateRole(companyId, req.params.id, req.body);
  res.json({ data: record });
});

export const deleteRoleHandler = asyncHandler(async (req, res) => {
  const companyId = requireCompanyId(req);
  await service.deleteRole(companyId, req.params.id);
  res.status(204).send();
});
