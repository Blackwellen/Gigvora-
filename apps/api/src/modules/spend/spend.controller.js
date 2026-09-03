import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { AppError } from '../../common/errors/AppError.js';
import * as service from './spend.service.js';

function requireCompanyId(req) {
  const companyId = req.workspaceContext?.companyId;
  if (!companyId) throw new AppError('Select a business workspace to continue', 400, { code: 'WORKSPACE_REQUIRED' });
  return companyId;
}

export const listHandler = asyncHandler(async (req, res) => {
  const companyId = requireCompanyId(req);
  const { category, department_id, team_id, status, from, to, limit, offset } = req.query;
  const result = await service.list(companyId, { category, department_id, team_id, status, from, to, limit, offset });
  res.json({ data: result.items, meta: { total: result.total } });
});

export const summaryHandler = asyncHandler(async (req, res) => {
  const companyId = requireCompanyId(req);
  const result = await service.summary(companyId, { period: req.query.period });
  res.json({ data: result });
});

export const listBudgetsHandler = asyncHandler(async (req, res) => {
  const companyId = requireCompanyId(req);
  const result = await service.listBudgets(companyId, { period: req.query.period });
  res.json({ data: result.items, meta: { total: result.total } });
});

export const createHandler = asyncHandler(async (req, res) => {
  const companyId = requireCompanyId(req);
  const record = await service.create(companyId, req.body, req.user.sub);
  res.status(201).json({ data: record });
});

export const updateHandler = asyncHandler(async (req, res) => {
  const companyId = requireCompanyId(req);
  const record = await service.update(companyId, req.params.id, req.body);
  res.json({ data: record });
});

export const createBudgetHandler = asyncHandler(async (req, res) => {
  const companyId = requireCompanyId(req);
  const record = await service.createBudget(companyId, req.body);
  res.status(201).json({ data: record });
});

export const updateBudgetHandler = asyncHandler(async (req, res) => {
  const companyId = requireCompanyId(req);
  const record = await service.updateBudget(companyId, req.params.id, req.body);
  res.json({ data: record });
});
