import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './advanced-candidate-search.service.js';

export const runQueryHandler = asyncHandler(async (req, res) => {
  const result = await service.runQuery(req.body);
  res.json({ data: result.items, meta: { total: result.total, semantic: result.semantic } });
});

export const listSavedQueriesHandler = asyncHandler(async (req, res) => {
  const rows = await service.listSavedQueries(req.user.sub);
  res.json({ data: rows, meta: { total: rows.length } });
});

export const createSavedQueryHandler = asyncHandler(async (req, res) => {
  const row = await service.createSavedQuery(req.user.sub, req.body);
  res.status(201).json({ data: row });
});

export const deleteSavedQueryHandler = asyncHandler(async (req, res) => {
  await service.deleteSavedQuery(req.user.sub, req.params.id);
  res.status(204).send();
});
