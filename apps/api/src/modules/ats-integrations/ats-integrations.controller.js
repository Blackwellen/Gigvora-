import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './ats-integrations.service.js';

export const listConnectionsHandler = asyncHandler(async (req, res) => {
  const rows = await service.listConnections(req.user.sub);
  res.json({ data: rows, meta: { total: rows.length } });
});

export const createConnectionHandler = asyncHandler(async (req, res) => {
  const row = await service.createConnection(req.user.sub, req.body);
  res.status(201).json({ data: row });
});

export const disconnectHandler = asyncHandler(async (req, res) => {
  const row = await service.disconnect(req.user.sub, req.params.id);
  res.json({ data: row });
});

export const listFieldMappingsHandler = asyncHandler(async (req, res) => {
  const rows = await service.listFieldMappings(req.user.sub, req.params.id);
  res.json({ data: rows, meta: { total: rows.length } });
});

export const updateFieldMappingHandler = asyncHandler(async (req, res) => {
  const row = await service.updateFieldMapping(req.user.sub, req.params.id, req.params.mappingId, req.body);
  res.json({ data: row });
});

export const listSyncRunsHandler = asyncHandler(async (req, res) => {
  const rows = await service.listSyncRuns(req.user.sub, req.params.id);
  res.json({ data: rows, meta: { total: rows.length } });
});

export const triggerSyncHandler = asyncHandler(async (req, res) => {
  const row = await service.triggerSync(req.user.sub, req.params.id);
  res.status(201).json({ data: row });
});
