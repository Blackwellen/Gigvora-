import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './recruiter-search-alerts.service.js';

export const listSavedSearchesHandler = asyncHandler(async (req, res) => {
  const rows = await service.listSavedSearches(req.user.sub);
  res.json({ data: rows, meta: { total: rows.length } });
});

export const createSavedSearchHandler = asyncHandler(async (req, res) => {
  const row = await service.createSavedSearch(req.user.sub, req.body);
  res.status(201).json({ data: row });
});

export const removeSavedSearchHandler = asyncHandler(async (req, res) => {
  await service.removeSavedSearch(req.user.sub, req.params.id);
  res.status(204).send();
});

export const listHandler = asyncHandler(async (req, res) => {
  const rows = await service.list(req.user.sub, { status: req.query.status });
  res.json({ data: rows, meta: { total: rows.length } });
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

export const runNowHandler = asyncHandler(async (req, res) => {
  const result = await service.runNow(req.user.sub, req.params.id);
  res.json({ data: result.alert, meta: { matches: result.matches } });
});
