import { Worker } from 'bullmq';
import { config } from '../../config/index.js';
import { db } from '../../db/connection.js';
import { getObjectBuffer, uploadObject } from '../../storage/s3.js';
import { generateObjectKey } from '../../storage/objectKeys.js';
import { sanitizePdfBuffer, sanitizeOoxmlBuffer, newAssetId } from '../../security/sanitize.js';
import { importParseQueue } from '../queues/index.js';
import { publishImportEvent } from '../../common/events/importEvents.js';

const connection = { url: config.redis.url };

const TEXTUAL_MIME_PREFIXES = ['text/'];

export const importSanitizeWorker = new Worker(
  'import-sanitize',
  async (job) => {
    const { importFileId, importId } = job.data;

    const fileRow = await db('import_files').where({ id: importFileId }).first();
    if (!fileRow) return;
    if (fileRow.upload_status === 'ready_for_parse' || fileRow.upload_status === 'parsed') return; // idempotent
    if (fileRow.scan_status !== 'clean') return; // never sanitize/serve a file that hasn't passed scan_status = 'clean'

    const importRow = await db('imports').where({ id: importId }).first();
    if (!importRow) return;
    const owner = { ownerUserId: importRow.owner_type === 'user' ? importRow.owner_id : null, workspaceId: importRow.workspace_id };

    await db('import_files').where({ id: importFileId }).update({ upload_status: 'sanitizing', updated_at: db.fn.now() });

    const buffer = await getObjectBuffer(fileRow.storage_key);
    const originalAssetId = fileRow.original_asset_id || newAssetId();

    let sanitizedBuffer = buffer;
    let sanitizationStatus = 'not_needed';
    let removed = [];

    const mime = fileRow.mime_type_detected || '';
    if (mime === 'application/pdf') {
      const result = sanitizePdfBuffer(buffer);
      sanitizedBuffer = result.sanitizedBuffer;
      removed = result.removed;
      sanitizationStatus = 'sanitized';
    } else if (mime.includes('officedocument') || mime === 'application/vnd.ms-excel') {
      try {
        const result = await sanitizeOoxmlBuffer(buffer);
        sanitizedBuffer = result.sanitizedBuffer;
        removed = result.removed;
        sanitizationStatus = 'sanitized';
      } catch (err) {
        await db('import_files')
          .where({ id: importFileId })
          .update({ sanitization_status: 'failed', upload_status: 'failed', parser_error: err.message, updated_at: db.fn.now() });
        publishImportEvent({ importId, importFileId, ...owner, type: 'file:sanitize_failed', payload: { reason: err.message } });
        return;
      }
    } else if (TEXTUAL_MIME_PREFIXES.some((p) => mime.startsWith(p)) || !mime) {
      sanitizationStatus = 'not_needed';
    }

    const sanitizedAssetId = newAssetId();
    const ext = fileRow.storage_key.split('.').pop();
    const sanitizedKey = generateObjectKey('sanitized', { ownerId: importRow.owner_id, ext });
    await uploadObject({ key: sanitizedKey, body: sanitizedBuffer, contentType: mime || 'application/octet-stream' });

    await db('import_files')
      .where({ id: importFileId })
      .update({
        sanitized_storage_key: sanitizedKey,
        original_asset_id: originalAssetId,
        sanitized_asset_id: sanitizedAssetId,
        sanitization_status: sanitizationStatus,
        upload_status: 'ready_for_parse',
        scan_details: JSON.stringify({ ...(fileRow.scan_details || {}), sanitizeRemoved: removed }),
        updated_at: db.fn.now(),
      });

    publishImportEvent({ importId, importFileId, ...owner, type: 'file:sanitized', payload: { sanitizationStatus } });

    await importParseQueue.add('parse', { importFileId, importId }, { jobId: `parse-${importFileId}` });
  },
  { connection, concurrency: 4 }
);

importSanitizeWorker.on('failed', (job, err) => {
  // eslint-disable-next-line no-console
  console.error(`[worker] import-sanitize job ${job?.id} failed`, err.message);
});
