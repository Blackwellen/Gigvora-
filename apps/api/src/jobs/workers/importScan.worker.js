import { Worker } from 'bullmq';
import { config } from '../../config/index.js';
import { db } from '../../db/connection.js';
import { getObjectBuffer } from '../../storage/s3.js';
import { sha256Hex } from '../../storage/objectKeys.js';
import { validateFileBuffer } from '../../security/fileValidation.js';
import { scanBuffer } from '../../security/malwareScanner.js';
import { scanPdfBuffer, scanOoxmlBuffer } from '../../security/documentScanner.js';
import { importSanitizeQueue } from '../queues/index.js';
import { publishImportEvent } from '../../common/events/importEvents.js';
import { AppError } from '../../common/errors/AppError.js';

const connection = { url: config.redis.url };

async function ownerFor(importRow) {
  return {
    ownerUserId: importRow.owner_type === 'user' ? importRow.owner_id : null,
    workspaceId: importRow.workspace_id,
  };
}

export const importScanWorker = new Worker(
  'import-scan',
  async (job) => {
    const { importFileId, importId } = job.data;

    const fileRow = await db('import_files').where({ id: importFileId }).first();
    if (!fileRow) return; // idempotent no-op if already removed
    if (fileRow.scan_status === 'clean') return; // idempotent — already scanned clean, avoid double work

    const importRow = await db('imports').where({ id: importId }).first();
    if (!importRow) return;
    const owner = await ownerFor(importRow);

    await db('import_files').where({ id: importFileId }).update({ upload_status: 'scanning', updated_at: db.fn.now() });

    const buffer = await getObjectBuffer(fileRow.storage_key);
    const sha256 = sha256Hex(buffer);

    let detected;
    try {
      detected = await validateFileBuffer({
        buffer,
        declaredMimeType: fileRow.mime_type_declared,
        filename: fileRow.original_filename,
        importType: importRow.import_type,
      });
    } catch (err) {
      if (err instanceof AppError) {
        await db('import_files')
          .where({ id: importFileId })
          .update({
            sha256,
            scan_status: 'error',
            scanner: 'validation',
            scan_details: JSON.stringify({ reasons: [err.message], code: err.details?.code }),
            upload_status: 'failed',
            updated_at: db.fn.now(),
          });
        publishImportEvent({ importId, importFileId, ...owner, type: 'file:scan_failed', payload: { reason: err.message } });
        return; // deterministic rejection — do not retry
      }
      throw err;
    }

    const malwareResult = await scanBuffer(buffer, { declaredAsDocument: true });

    let docScan = null;
    if (detected.detectedExt === 'pdf' || detected.detectedMime === 'application/pdf') {
      docScan = scanPdfBuffer(buffer);
    } else if (
      detected.detectedExt === 'docx' ||
      detected.detectedExt === 'xlsx' ||
      detected.detectedMime?.includes('officedocument')
    ) {
      docScan = await scanOoxmlBuffer(buffer);
    }

    let scanStatus = malwareResult.result; // 'clean' | 'infected' | 'suspicious' | 'error'
    if (scanStatus === 'clean' && docScan?.suspicious) scanStatus = 'suspicious';

    const uploadStatus =
      scanStatus === 'clean' ? 'uploaded' : scanStatus === 'error' ? 'scan_failed' : 'quarantined';

    await db('import_files')
      .where({ id: importFileId })
      .update({
        mime_type_detected: detected.detectedMime,
        sha256,
        scan_status: scanStatus,
        scanner: malwareResult.engine,
        scan_details: JSON.stringify({ malware: malwareResult, document: docScan }),
        upload_status: uploadStatus,
        updated_at: db.fn.now(),
      });

    publishImportEvent({ importId, importFileId, ...owner, type: 'file:scanned', payload: { scanStatus, scanner: malwareResult.engine } });

    if (scanStatus === 'clean') {
      await importSanitizeQueue.add('sanitize', { importFileId, importId }, { jobId: `sanitize-${importFileId}` });
    }
  },
  { connection, concurrency: 4 }
);

importScanWorker.on('failed', (job, err) => {
  // eslint-disable-next-line no-console
  console.error(`[worker] import-scan job ${job?.id} failed`, err.message);
});
