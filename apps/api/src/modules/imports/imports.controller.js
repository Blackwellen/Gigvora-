import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './imports.service.js';
import { TARGET_FIELDS_BY_IMPORT_TYPE } from './importFieldAllowlist.js';
import { AppError } from '../../common/errors/AppError.js';

export const createHandler = asyncHandler(async (req, res) => {
  const owner = service.resolveOwner(req);
  const record = await service.createImport(owner, { importType: req.body.importType, createdBy: req.user.sub });
  res.status(201).json({ data: record });
});

export const listHandler = asyncHandler(async (req, res) => {
  const owner = service.resolveOwner(req);
  const { limit, offset } = req.query;
  const records = await service.listImports(owner, { limit: Number(limit) || undefined, offset: Number(offset) || undefined });
  res.json({ data: records });
});

export const getHandler = asyncHandler(async (req, res) => {
  const owner = service.resolveOwner(req);
  const record = await service.getImport(owner, req.params.id);
  res.json({ data: record });
});

export const statusHandler = asyncHandler(async (req, res) => {
  const owner = service.resolveOwner(req);
  const record = await service.getImportStatus(owner, req.params.id);
  res.json({ data: record });
});

export const uploadUrlHandler = asyncHandler(async (req, res) => {
  const owner = service.resolveOwner(req);
  const result = await service.requestUploadUrl(owner, req.params.id, req.body);
  res.status(201).json({ data: result });
});

export const completeUploadHandler = asyncHandler(async (req, res) => {
  const owner = service.resolveOwner(req);
  const record = await service.completeUpload(owner, req.params.id, req.params.fileId);
  res.json({ data: record });
});

export const listMappingsHandler = asyncHandler(async (req, res) => {
  const owner = service.resolveOwner(req);
  const records = await service.listMappings(owner, req.params.id);
  res.json({ data: records });
});

export const updateMappingsHandler = asyncHandler(async (req, res) => {
  const owner = service.resolveOwner(req);
  const records = await service.updateMappings(owner, req.params.id, req.body.mappings);
  res.json({ data: records });
});

export const listDedupeHandler = asyncHandler(async (req, res) => {
  const owner = service.resolveOwner(req);
  const records = await service.listDedupeMatches(owner, req.params.id);
  res.json({ data: records });
});

export const dedupeDecisionHandler = asyncHandler(async (req, res) => {
  const owner = service.resolveOwner(req);
  const record = await service.recordDedupeDecision(owner, req.params.id, req.params.matchId, req.body.decision, req.user.sub);
  res.json({ data: record });
});

export const validateHandler = asyncHandler(async (req, res) => {
  const owner = service.resolveOwner(req);
  const record = await service.validateImport(owner, req.params.id);
  res.json({ data: record });
});

export const commitHandler = asyncHandler(async (req, res) => {
  const owner = service.resolveOwner(req);
  const record = await service.commitImport(owner, req.params.id);
  res.status(202).json({ data: record });
});

export const cancelHandler = asyncHandler(async (req, res) => {
  const owner = service.resolveOwner(req);
  const record = await service.cancelImport(owner, req.params.id);
  res.json({ data: record });
});

// Single server-side source of truth for the mapping allowlist (Domain 04
// §39/§63: the client must never invent target-field names) — the web app's
// Map Fields step and CSV template generator both read this instead of
// keeping their own copy that could drift from what PATCH /mappings accepts.
export const targetFieldsHandler = asyncHandler(async (req, res) => {
  const fields = TARGET_FIELDS_BY_IMPORT_TYPE[req.params.importType];
  if (!fields) throw new AppError('Unknown import type', 404, { code: 'UNKNOWN_IMPORT_TYPE' });
  res.json({ data: { importType: req.params.importType, fields } });
});
