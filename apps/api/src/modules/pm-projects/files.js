// Domain 18 Phase B — Files (18.11). One file per sub-domain from here on
// (business logic + handlers + router together) rather than the
// service/controller split used in projects/members/tasks — with a dozen
// more sub-domains to add, one file each keeps the module navigable without
// a 1:1 explosion of near-empty controller files. Mounted with
// { mergeParams: true } so `req.params.id` (the project id) is available.
import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { fileTypeFromBuffer } from 'file-type';
import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { emitEvent } from '../../common/events/outbox.js';
import { uploadObject, deleteObject, getSignedDownloadUrl } from '../../storage/s3.js';
import { scanBuffer } from '../../security/malwareScanner.js';
import { loadProjectContext } from './shared.js';
import { canManageTasks, canEditProject, assertPermission } from './permissions.js';

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv',
  'application/zip',
]);
const MAX_BYTES = 50 * 1024 * 1024;

function serializeFile(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    taskId: row.task_id,
    deliverableId: row.deliverable_id,
    filename: row.filename,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    version: row.version,
    replacesFileId: row.replaces_file_id,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
  };
}

async function assertAccess(projectId, userId) {
  const { membership } = await loadProjectContext(projectId, userId);
  assertPermission(Boolean(membership), 'You do not have access to this project');
  return membership;
}

/**
 * Security pipeline for every upload (spec §14): size + declared-MIME
 * allowlist, then magic-byte re-verification so a mislabeled/polyglot file
 * is rejected even if the browser sent a permitted Content-Type, then a
 * malware scan — reusing the same `scanBuffer` pipeline as Domain 14
 * uploads (modules/professional-profile/uploads.js) rather than a second
 * one. Only on a clean result does the object get written to private
 * storage; nothing is ever exposed before that point.
 */
export async function secureProjectUpload(file, { projectId, userId }) {
  if (!file) throw new AppError('No file provided', 422);
  if (!ALLOWED_MIME.has(file.mimetype)) throw new AppError('Unsupported file type', 422, { code: 'UNSUPPORTED_TYPE' });
  if (file.size > MAX_BYTES) throw new AppError('File exceeds the 50MB limit', 422);

  const detected = await fileTypeFromBuffer(file.buffer);
  // Plain-text/CSV files have no magic-byte signature file-type can verify —
  // accept those on declared MIME alone; everything else must match.
  if (detected) {
    if (!ALLOWED_MIME.has(detected.mime)) throw new AppError('Could not verify file signature', 422, { code: 'SIGNATURE_NOT_ALLOWED' });
    if (detected.mime !== file.mimetype) throw new AppError('Declared content type does not match the file signature', 422, { code: 'MIME_SIGNATURE_MISMATCH' });
  } else if (!['text/plain', 'text/csv'].includes(file.mimetype)) {
    throw new AppError('Could not verify file signature', 422, { code: 'SIGNATURE_NOT_ALLOWED' });
  }

  const scanResult = await scanBuffer(file.buffer, { declaredAsDocument: file.mimetype !== 'application/zip' });
  if (scanResult.result !== 'clean') {
    throw new AppError('This file failed a security scan and cannot be uploaded', 422, { code: 'MALWARE_SCAN_FAILED', scanResult: scanResult.result });
  }

  const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `pm-projects/${projectId}/${userId}/${randomUUID()}-${safeName}`;
  await uploadObject({ key, body: file.buffer, contentType: file.mimetype });
  return { key, filename: safeName, mimeType: file.mimetype, sizeBytes: file.size };
}

export const router = Router({ mergeParams: true });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES } });

router.get('/', asyncHandler(async (req, res) => {
  await assertAccess(req.params.id, req.user.sub);
  const rows = await db('pm_project_files').where({ project_id: req.params.id }).orderBy('created_at', 'desc');
  res.json({ data: rows.map(serializeFile) });
}));

router.post('/', upload.single('file'), asyncHandler(async (req, res) => {
  const membership = await assertAccess(req.params.id, req.user.sub);
  assertPermission(canManageTasks(membership), 'You do not have permission to upload files');

  const uploaded = await secureProjectUpload(req.file, { projectId: req.params.id, userId: req.user.sub });
  const [row] = await db('pm_project_files')
    .insert({
      project_id: req.params.id,
      task_id: req.body.taskId || null,
      deliverable_id: req.body.deliverableId || null,
      object_key: uploaded.key,
      filename: uploaded.filename,
      mime_type: uploaded.mimeType,
      size_bytes: uploaded.sizeBytes,
      uploaded_by: req.user.sub,
    })
    .returning('*');

  await emitEvent({ aggregateType: 'pm_project_file', aggregateId: row.id, eventType: 'project.file_added', payload: { projectId: req.params.id, filename: row.filename } });
  res.status(201).json({ data: serializeFile(row) });
}));

router.get('/:fileId/download-url', asyncHandler(async (req, res) => {
  await assertAccess(req.params.id, req.user.sub);
  const file = await db('pm_project_files').where({ id: req.params.fileId, project_id: req.params.id }).first();
  if (!file) throw new AppError('File not found', 404);
  // Short-lived signed URL — the object itself is never made public (spec §14).
  const url = await getSignedDownloadUrl(file.object_key, 300);
  res.json({ data: { url, expiresInSeconds: 300 } });
}));

router.delete('/:fileId', asyncHandler(async (req, res) => {
  const membership = await assertAccess(req.params.id, req.user.sub);
  const file = await db('pm_project_files').where({ id: req.params.fileId, project_id: req.params.id }).first();
  if (!file) throw new AppError('File not found', 404);
  assertPermission(canEditProject(membership) || file.uploaded_by === req.user.sub, 'You do not have permission to delete this file');

  await db('pm_project_files').where({ id: file.id }).del();
  await deleteObject(file.object_key).catch(() => {});
  await emitEvent({ aggregateType: 'pm_project_file', aggregateId: file.id, eventType: 'project.file_deleted', payload: { projectId: req.params.id } });
  res.status(204).end();
}));

export default router;
