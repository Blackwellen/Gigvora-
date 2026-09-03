import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './users.service.js';
import { getUserEntitlements } from '../billing/billing.service.js';

export const listHandler = asyncHandler(async (req, res) => {
  const { limit, offset } = req.query;
  const records = await service.list({ limit: Number(limit) || undefined, offset: Number(offset) || undefined });
  res.json({ data: records });
});

export const getMeHandler = asyncHandler(async (req, res) => {
  const record = await service.getMe(req.user.sub);
  res.json({ data: record });
});

export const getMeEntitlementsHandler = asyncHandler(async (req, res) => {
  const data = await getUserEntitlements(req.user.sub);
  res.json({ data });
});

export const getHandler = asyncHandler(async (req, res) => {
  const record = await service.getById(req.params.id);
  res.json({ data: record });
});

export const createHandler = asyncHandler(async (req, res) => {
  const record = await service.create(req.body);
  res.status(201).json({ data: record });
});

export const updateHandler = asyncHandler(async (req, res) => {
  const record = await service.update(req.params.id, req.body);
  res.json({ data: record });
});

export const removeHandler = asyncHandler(async (req, res) => {
  await service.remove(req.params.id);
  res.status(204).send();
});

export const followHandler = asyncHandler(async (req, res) => {
  const data = await service.followUser(req.user.sub, req.params.id);
  res.status(201).json({ data });
});

export const unfollowHandler = asyncHandler(async (req, res) => {
  const data = await service.unfollowUser(req.user.sub, req.params.id);
  res.json({ data });
});

export const followStatusHandler = asyncHandler(async (req, res) => {
  const data = await service.getFollowStatus(req.user.sub, req.params.id);
  res.json({ data });
});
