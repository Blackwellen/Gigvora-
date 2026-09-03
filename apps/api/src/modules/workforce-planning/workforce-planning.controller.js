import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { AppError } from '../../common/errors/AppError.js';
import * as service from './workforce-planning.service.js';

function requireCompanyId(req) {
  const companyId = req.workspaceContext?.companyId;
  if (!companyId) throw new AppError('Select a business workspace to continue', 400, { code: 'WORKSPACE_REQUIRED' });
  return companyId;
}

export const listPlansHandler = asyncHandler(async (req, res) => {
  const companyId = requireCompanyId(req);
  const { status, department_id, limit, offset } = req.query;
  const result = await service.listPlans(companyId, {
    status,
    department_id,
    limit: limit ? Number(limit) : undefined,
    offset: offset ? Number(offset) : undefined,
  });
  res.json({ data: result.items, meta: { total: result.total } });
});

export const getPlanHandler = asyncHandler(async (req, res) => {
  const companyId = requireCompanyId(req);
  const record = await service.getPlanById(req.params.id, companyId);
  res.json({ data: record });
});

export const createPlanHandler = asyncHandler(async (req, res) => {
  const companyId = requireCompanyId(req);
  const record = await service.createPlan(req.body, { companyId, userId: req.user.sub });
  res.status(201).json({ data: record });
});

export const updatePlanHandler = asyncHandler(async (req, res) => {
  const companyId = requireCompanyId(req);
  const record = await service.updatePlan(req.params.id, req.body, { companyId });
  res.json({ data: record });
});

export const createScenarioHandler = asyncHandler(async (req, res) => {
  const companyId = requireCompanyId(req);
  const record = await service.createScenario(req.params.id, req.body, { companyId });
  res.status(201).json({ data: record });
});

export const updateScenarioHandler = asyncHandler(async (req, res) => {
  const companyId = requireCompanyId(req);
  const record = await service.updateScenario(req.params.id, req.body, { companyId });
  res.json({ data: record });
});
