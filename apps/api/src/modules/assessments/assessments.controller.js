import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './assessments.service.js';

export const getHandler = asyncHandler(async (req, res) => {
  const record = await service.getById(req.params.id);
  res.json({ data: record });
});

export const createHandler = asyncHandler(async (req, res) => {
  const record = await service.create(req.body, req.user.sub);
  res.status(201).json({ data: record });
});

export const assignHandler = asyncHandler(async (req, res) => {
  const record = await service.assign(req.params.id, req.body);
  res.status(201).json({ data: record });
});

export const submitHandler = asyncHandler(async (req, res) => {
  const record = await service.submit(req.params.assignmentId, req.body);
  res.status(201).json({ data: record });
});

export const byApplicationHandler = asyncHandler(async (req, res) => {
  const records = await service.listByApplication(req.params.applicationId);
  res.json({ data: records });
});
