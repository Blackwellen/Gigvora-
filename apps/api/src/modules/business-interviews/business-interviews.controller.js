import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { AppError } from '../../common/errors/AppError.js';
import * as service from './business-interviews.service.js';

function requireCompanyId(req) {
  const companyId = req.workspaceContext?.companyId;
  if (!companyId) throw new AppError('Select a business workspace to continue', 400, { code: 'WORKSPACE_REQUIRED' });
  return companyId;
}

export const listHandler = asyncHandler(async (req, res) => {
  const { from, to, status, interviewer_id, limit, offset } = req.query;
  const result = await service.list(requireCompanyId(req), { from, to, status, interviewer_id, limit, offset });
  res.json({ data: result.items, meta: { total: result.total } });
});

export const getHandler = asyncHandler(async (req, res) => {
  const record = await service.getById(req.params.id, requireCompanyId(req));
  res.json({ data: record });
});
