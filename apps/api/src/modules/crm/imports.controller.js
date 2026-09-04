import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { resolveOwner } from './shared.js';
import * as service from './imports.service.js';

export const createHandler = asyncHandler(async (req, res) => {
  const owner = resolveOwner(req);
  const record = await service.create(owner, req.user.sub, req.body);
  res.status(201).json({ data: record });
});

export const getHandler = asyncHandler(async (req, res) => {
  const owner = resolveOwner(req);
  const record = await service.getById(owner, req.params.id);
  res.json({ data: record });
});

export const addRowsHandler = asyncHandler(async (req, res) => {
  const owner = resolveOwner(req);
  const rows = await service.addRows(owner, req.params.id, req.body?.rows || req.body);
  res.status(201).json({ data: rows });
});

export const listRowsHandler = asyncHandler(async (req, res) => {
  const owner = resolveOwner(req);
  const result = await service.listRows(owner, req.params.id, req.query);
  res.json({ data: result.data, meta: { total: result.total } });
});

export const processHandler = asyncHandler(async (req, res) => {
  const owner = resolveOwner(req);
  const record = await service.process(owner, req.user.sub, req.params.id);
  res.json({ data: record });
});
