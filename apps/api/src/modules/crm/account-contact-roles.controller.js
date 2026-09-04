import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { resolveOwner } from './shared.js';
import * as service from './account-contact-roles.service.js';

export const listHandler = asyncHandler(async (req, res) => {
  const owner = resolveOwner(req);
  const records = await service.list(owner, req.params.accountId);
  res.json({ data: records });
});

export const createHandler = asyncHandler(async (req, res) => {
  const owner = resolveOwner(req);
  const record = await service.create(owner, req.user.sub, req.params.accountId, req.body);
  res.status(201).json({ data: record });
});

export const updateHandler = asyncHandler(async (req, res) => {
  const owner = resolveOwner(req);
  const record = await service.update(owner, req.user.sub, req.params.accountId, req.params.roleId, req.body);
  res.json({ data: record });
});

export const removeHandler = asyncHandler(async (req, res) => {
  const owner = resolveOwner(req);
  await service.remove(owner, req.user.sub, req.params.accountId, req.params.roleId);
  res.status(204).send();
});
