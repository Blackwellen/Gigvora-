import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './advanced-alerts.service.js';

export const listHandler = asyncHandler(async (req, res) => {
  const rows = await service.list(req.user.sub, { severity: req.query.severity, read: req.query.read });
  res.json({ data: rows, meta: { total: rows.length } });
});

export const updateHandler = asyncHandler(async (req, res) => {
  const row = await service.update(req.user.sub, req.params.id, req.body);
  res.json({ data: row });
});
