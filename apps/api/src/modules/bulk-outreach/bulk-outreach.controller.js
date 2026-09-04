import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './bulk-outreach.service.js';

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

export const listAudienceHandler = asyncHandler(async (req, res) => {
  const rows = await service.listAudience(req.user.sub, req.params.id);
  res.json({ data: rows, meta: { total: rows.length } });
});

export const addAudienceMemberHandler = asyncHandler(async (req, res) => {
  const row = await service.addAudienceMember(req.user.sub, req.params.id, req.body);
  res.status(201).json({ data: row });
});

export const removeAudienceMemberHandler = asyncHandler(async (req, res) => {
  await service.removeAudienceMember(req.user.sub, req.params.id, req.params.audienceId);
  res.status(204).send();
});

export const listVariantsHandler = asyncHandler(async (req, res) => {
  const rows = await service.listVariants(req.user.sub, req.params.id);
  res.json({ data: rows, meta: { total: rows.length } });
});

export const addVariantHandler = asyncHandler(async (req, res) => {
  const row = await service.addVariant(req.user.sub, req.params.id, req.body);
  res.status(201).json({ data: row });
});

export const removeVariantHandler = asyncHandler(async (req, res) => {
  await service.removeVariant(req.user.sub, req.params.id, req.params.variantId);
  res.status(204).send();
});

export const sendHandler = asyncHandler(async (req, res) => {
  const row = await service.send(req.user.sub, req.params.id);
  res.json({ data: row });
});
