import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './recruiter-shortlists.service.js';

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

export const addMemberHandler = asyncHandler(async (req, res) => {
  const row = await service.addMember(req.user.sub, req.params.id, req.body);
  res.status(201).json({ data: row });
});

export const updateMemberHandler = asyncHandler(async (req, res) => {
  const row = await service.updateMember(req.user.sub, req.params.id, req.params.memberId, req.body);
  res.json({ data: row });
});

export const removeMemberHandler = asyncHandler(async (req, res) => {
  await service.removeMember(req.user.sub, req.params.id, req.params.memberId);
  res.status(204).send();
});
