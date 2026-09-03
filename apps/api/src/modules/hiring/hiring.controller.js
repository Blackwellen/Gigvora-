import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { AppError } from '../../common/errors/AppError.js';
import * as service from './hiring.service.js';

function requireCompanyId(req) {
  const companyId = req.workspaceContext?.companyId;
  if (!companyId) throw new AppError('Select a business workspace to continue', 400, { code: 'WORKSPACE_REQUIRED' });
  return companyId;
}

export const overviewHandler = asyncHandler(async (req, res) => {
  const result = await service.overview(requireCompanyId(req));
  res.json({ data: result });
});

export const listPlansHandler = asyncHandler(async (req, res) => {
  const { status, priority, department_id } = req.query;
  const result = await service.listPlans(requireCompanyId(req), { status, priority, department_id });
  res.json({ data: result.items, meta: { total: result.total } });
});

export const createPlanHandler = asyncHandler(async (req, res) => {
  const record = await service.createPlan(requireCompanyId(req), req.body);
  res.status(201).json({ data: record });
});

export const updatePlanHandler = asyncHandler(async (req, res) => {
  const record = await service.updatePlan(req.params.id, requireCompanyId(req), req.body);
  res.json({ data: record });
});

export const removePlanHandler = asyncHandler(async (req, res) => {
  await service.removePlan(req.params.id, requireCompanyId(req));
  res.status(204).send();
});

export const bottlenecksHandler = asyncHandler(async (req, res) => {
  const result = await service.bottlenecks(requireCompanyId(req));
  res.json({ data: result });
});
