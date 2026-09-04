import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './sequences.service.js';

export const listHandler = asyncHandler(async (req, res) => {
  const rows = await service.list(req.user.sub, { status: req.query.status });
  res.json({ data: rows, meta: { total: rows.length } });
});

export const getHandler = asyncHandler(async (req, res) => {
  const row = await service.getById(req.user.sub, req.params.id);
  res.json({ data: row });
});

export const createHandler = asyncHandler(async (req, res) => {
  const row = await service.create(req.user.sub, req.body);
  res.status(201).json({ data: row });
});

export const updateHandler = asyncHandler(async (req, res) => {
  const row = await service.update(req.user.sub, req.params.id, req.body);
  res.json({ data: row });
});

export const removeHandler = asyncHandler(async (req, res) => {
  await service.remove(req.user.sub, req.params.id);
  res.status(204).send();
});

export const addStepHandler = asyncHandler(async (req, res) => {
  const row = await service.addStep(req.user.sub, req.params.id, req.body);
  res.status(201).json({ data: row });
});

export const reorderStepHandler = asyncHandler(async (req, res) => {
  const row = await service.reorderStep(req.user.sub, req.params.id, req.params.stepId, req.body);
  res.json({ data: row });
});

export const removeStepHandler = asyncHandler(async (req, res) => {
  await service.removeStep(req.user.sub, req.params.id, req.params.stepId);
  res.status(204).send();
});

export const enrollHandler = asyncHandler(async (req, res) => {
  const row = await service.enroll(req.user.sub, req.params.id, req.body);
  res.status(201).json({ data: row });
});

export const listEnrollmentsHandler = asyncHandler(async (req, res) => {
  const rows = await service.listEnrollments(req.user.sub, req.params.id, { status: req.query.status });
  res.json({ data: rows, meta: { total: rows.length } });
});

export const advanceEnrollmentHandler = asyncHandler(async (req, res) => {
  const row = await service.advanceEnrollment(req.user.sub, req.params.enrollmentId);
  res.json({ data: row });
});
