import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { generateObjectKey, sanitizeDisplayName, extensionFromFilename, KEY_PREFIXES } from '../../storage/objectKeys.js';
import { getSignedUploadUrl, headObject } from '../../storage/s3.js';
import { getAllowlist } from '../../security/fileValidation.js';
import { importScanQueue, importCommitQueue } from '../../jobs/queues/index.js';
import { isValidTargetField } from './importFieldAllowlist.js';
import { publishImportEvent } from '../../common/events/importEvents.js';

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25MB per file

export function resolveOwner(req) {
  const workspace = req.workspaceContext;
  if (workspace?.type === 'organization') {
    return { ownerType: 'company', ownerId: workspace.companyId, workspaceId: workspace.companyId };
  }
  return { ownerType: 'user', ownerId: req.user.sub, workspaceId: null };
}

async function getOwnedImport(importId, owner) {
  const record = await db('imports').where({ id: importId, owner_type: owner.ownerType, owner_id: owner.ownerId }).first();
  if (!record) throw new AppError('Import not found', 404);
  return record;
}

export async function createImport(owner, { importType, createdBy }) {
  if (!['cv', 'profile', 'company', 'contacts'].includes(importType)) {
    throw new AppError('Invalid import_type', 422);
  }
  const [record] = await db('imports')
    .insert({
      owner_type: owner.ownerType,
      owner_id: owner.ownerId,
      workspace_id: owner.workspaceId,
      import_type: importType,
      status: 'draft',
      created_by: createdBy,
    })
    .returning('*');
  return record;
}

export async function listImports(owner, { limit = 20, offset = 0 } = {}) {
  return db('imports')
    .where({ owner_type: owner.ownerType, owner_id: owner.ownerId })
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset);
}

export async function getImport(owner, importId) {
  const record = await getOwnedImport(importId, owner);
  const files = await db('import_files').where({ import_id: importId }).orderBy('created_at', 'asc');
  return { ...record, files };
}

export async function getImportStatus(owner, importId) {
  const record = await getOwnedImport(importId, owner);
  const files = await db('import_files')
    .where({ import_id: importId })
    .select('id', 'original_filename', 'safe_display_name', 'upload_status', 'scan_status', 'sanitization_status', 'parser_status', 'parser_error');
  const rowCounts = await db('import_rows')
    .where({ import_id: importId })
    .select('status')
    .count('id as count')
    .groupBy('status');
  return {
    id: record.id,
    status: record.status,
    importType: record.import_type,
    files,
    rowCounts: Object.fromEntries(rowCounts.map((r) => [r.status, Number(r.count)])),
  };
}

export async function requestUploadUrl(owner, importId, { filename, contentType, sizeBytes }) {
  const record = await getOwnedImport(importId, owner);
  if (!['draft', 'uploading'].includes(record.status)) {
    throw new AppError('This import is no longer accepting uploads', 409);
  }
  if (!filename || !sizeBytes) throw new AppError('filename and sizeBytes are required', 422);
  if (sizeBytes > MAX_UPLOAD_BYTES) throw new AppError('File exceeds the maximum allowed upload size', 422);

  const allowlist = getAllowlist(record.import_type);
  const ext = extensionFromFilename(filename);
  if (!allowlist.extensions.includes(ext)) {
    throw new AppError(`File extension .${ext || '?'} is not allowed for ${record.import_type} imports`, 422);
  }

  const storageKey = generateObjectKey('quarantine', { ownerId: owner.ownerId, ext });
  const safeDisplayName = sanitizeDisplayName(filename);

  const [fileRecord] = await db('import_files')
    .insert({
      import_id: importId,
      original_filename: filename.slice(0, 255),
      safe_display_name: safeDisplayName,
      storage_key: storageKey,
      mime_type_declared: contentType || null,
      size_bytes: sizeBytes,
      upload_status: 'pending',
    })
    .returning('*');

  await db('imports').where({ id: importId }).update({ status: 'uploading', updated_at: db.fn.now() });

  const uploadUrl = await getSignedUploadUrl({ key: storageKey, contentType: contentType || 'application/octet-stream' });

  return {
    importFileId: fileRecord.id,
    uploadUrl,
    storageKey,
    expiresInSeconds: 900,
  };
}

export async function completeUpload(owner, importId, fileId) {
  const record = await getOwnedImport(importId, owner);
  const fileRecord = await db('import_files').where({ id: fileId, import_id: importId }).first();
  if (!fileRecord) throw new AppError('Import file not found', 404);

  const head = await headObject(fileRecord.storage_key);
  if (!head.exists) {
    throw new AppError('Uploaded object was not found in storage — upload may have failed', 422, { code: 'OBJECT_NOT_FOUND' });
  }
  if (fileRecord.size_bytes && Math.abs(head.sizeBytes - fileRecord.size_bytes) > 1024) {
    throw new AppError('Uploaded object size does not match the declared size', 422, { code: 'SIZE_MISMATCH' });
  }
  if (head.sizeBytes > MAX_UPLOAD_BYTES) {
    throw new AppError('Uploaded object exceeds the maximum allowed size', 422, { code: 'SIZE_TOO_LARGE' });
  }

  const [updated] = await db('import_files')
    .where({ id: fileId })
    .update({ upload_status: 'uploaded', size_bytes: head.sizeBytes, updated_at: db.fn.now() })
    .returning('*');

  await importScanQueue.add('scan', { importFileId: fileId, importId }, { jobId: `scan-${fileId}` });

  publishImportEvent({
    importId,
    importFileId: fileId,
    ownerUserId: owner.ownerType === 'user' ? owner.ownerId : null,
    workspaceId: owner.workspaceId,
    type: 'file:uploaded',
    payload: { uploadStatus: 'uploaded' },
  });

  return updated;
}

export async function listMappings(owner, importId) {
  await getOwnedImport(importId, owner);
  return db('import_field_mappings').where({ import_id: importId }).orderBy('created_at', 'asc');
}

export async function updateMappings(owner, importId, mappings) {
  const record = await getOwnedImport(importId, owner);
  if (!Array.isArray(mappings) || !mappings.length) throw new AppError('mappings must be a non-empty array', 422);

  const results = [];
  await db.transaction(async (trx) => {
    for (const m of mappings) {
      if (!m.id) throw new AppError('Each mapping update requires an id', 422);
      if (!isValidTargetField(m.targetField ?? null, record.import_type)) {
        throw new AppError(`target_field "${m.targetField}" is not allowed for ${record.import_type} imports`, 422, {
          code: 'TARGET_FIELD_NOT_ALLOWED',
        });
      }
      const [updated] = await trx('import_field_mappings')
        .where({ id: m.id, import_id: importId })
        .update({ target_field: m.targetField ?? null, is_manual_override: true, updated_at: trx.fn.now() })
        .returning('*');
      if (!updated) throw new AppError(`Mapping ${m.id} not found`, 404);
      results.push(updated);
    }
  });
  return results;
}

export async function listDedupeMatches(owner, importId) {
  await getOwnedImport(importId, owner);
  return db('import_dedupe_matches').where({ import_id: importId }).orderBy('created_at', 'asc');
}

export async function recordDedupeDecision(owner, importId, matchId, decision, decidedBy) {
  await getOwnedImport(importId, owner);
  if (!['merge', 'link', 'create_new', 'ignore'].includes(decision)) {
    throw new AppError('Invalid decision', 422);
  }
  // This endpoint ONLY records a decision — it never performs a destructive
  // merge itself. Materialization happens exclusively in commitImport ->
  // importCommit.worker.js, after the user explicitly commits.
  const [updated] = await db('import_dedupe_matches')
    .where({ id: matchId, import_id: importId })
    .update({ decision, decided_by: decidedBy, decided_at: db.fn.now(), updated_at: db.fn.now() })
    .returning('*');
  if (!updated) throw new AppError('Dedupe match not found', 404);
  return updated;
}

export async function validateImport(owner, importId) {
  const record = await getOwnedImport(importId, owner);

  const files = await db('import_files').where({ import_id: importId });
  if (!files.length) throw new AppError('No files uploaded for this import', 422);
  if (files.some((f) => f.scan_status !== 'clean')) {
    throw new AppError('All files must pass the malware scan before validating', 422, { code: 'SCAN_INCOMPLETE' });
  }
  if (files.some((f) => f.parser_status !== 'parsed')) {
    throw new AppError('All files must finish parsing before validating', 422, { code: 'PARSE_INCOMPLETE' });
  }

  const pendingDecisions = await db('import_dedupe_matches').where({ import_id: importId, decision: 'pending' }).count('id as count').first();
  if (Number(pendingDecisions.count) > 0) {
    throw new AppError('All duplicate matches must have a decision before validating', 422, { code: 'DEDUPE_PENDING' });
  }

  const rows = await db('import_rows').where({ import_id: importId }).whereIn('status', ['pending', 'mapped']);
  if (rows.length) {
    throw new AppError('Some rows have not finished mapping/validation yet', 422, { code: 'ROWS_INCOMPLETE' });
  }

  const [updated] = await db('imports')
    .where({ id: importId })
    .update({ status: 'ready_to_commit', updated_at: db.fn.now() })
    .returning('*');
  return updated;
}

export async function commitImport(owner, importId) {
  const record = await getOwnedImport(importId, owner);
  if (record.status !== 'ready_to_commit') {
    throw new AppError('Import must be validated (ready_to_commit) before it can be committed', 409);
  }
  await db('imports').where({ id: importId }).update({ status: 'committing', updated_at: db.fn.now() });
  await importCommitQueue.add('commit', { importId }, { jobId: `commit-${importId}` });
  publishImportEvent({
    importId,
    ownerUserId: owner.ownerType === 'user' ? owner.ownerId : null,
    workspaceId: owner.workspaceId,
    type: 'import:committing',
    payload: {},
  });
  return { id: importId, status: 'committing' };
}

export async function cancelImport(owner, importId) {
  const record = await getOwnedImport(importId, owner);
  if (['completed', 'committing'].includes(record.status)) {
    throw new AppError('This import can no longer be cancelled', 409);
  }
  const [updated] = await db('imports')
    .where({ id: importId })
    .update({ status: 'cancelled', cancelled_at: db.fn.now(), updated_at: db.fn.now() })
    .returning('*');
  return updated;
}

export { KEY_PREFIXES };
