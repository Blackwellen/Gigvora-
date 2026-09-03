import {
  importScanQueue,
  importSanitizeQueue,
  importParseQueue,
  importExtractQueue,
  importMapQueue,
  importDedupeQueue,
  importCommitQueue,
} from './queues/index.js';
import { db } from '../db/connection.js';
import { publishImportEvent } from '../common/events/importEvents.js';

const IMPORT_QUEUES = [
  importScanQueue,
  importSanitizeQueue,
  importParseQueue,
  importExtractQueue,
  importMapQueue,
  importDedupeQueue,
  importCommitQueue,
];

const SWEEP_INTERVAL_MS = 60000;

/**
 * Sweeps each import queue for jobs that have exhausted their retry budget
 * (attempts option in jobs/queues/index.js) and marks the corresponding
 * import_file/import row 'failed' rather than leaving it silently stuck —
 * every job is retryable with backoff, but none retries forever (Domain 04
 * §37).
 */
export async function sweepDeadLetterJobs() {
  for (const queue of IMPORT_QUEUES) {
    const failedJobs = await queue.getFailed(0, 100);
    for (const job of failedJobs) {
      if (job.attemptsMade < (job.opts.attempts || 1)) continue; // still has retries left
      const { importFileId, importId } = job.data || {};
      if (importFileId) {
        const fileRow = await db('import_files').where({ id: importFileId }).first();
        if (fileRow && fileRow.upload_status !== 'failed' && fileRow.upload_status !== 'imported') {
          await db('import_files')
            .where({ id: importFileId })
            .update({ upload_status: 'failed', parser_error: job.failedReason || 'Exceeded max retry attempts', updated_at: db.fn.now() });
          publishImportEvent({ importId, importFileId, type: 'file:dead_letter', payload: { queue: queue.name, reason: job.failedReason } });
        }
      } else if (importId) {
        const importRow = await db('imports').where({ id: importId }).first();
        if (importRow && importRow.status !== 'failed' && importRow.status !== 'completed') {
          await db('imports').where({ id: importId }).update({ status: 'failed', updated_at: db.fn.now() });
          publishImportEvent({ importId, type: 'import:dead_letter', payload: { queue: queue.name, reason: job.failedReason } });
        }
      }
      await job.remove().catch(() => {});
    }
  }
}

export function startDeadLetterSweeper() {
  const interval = setInterval(() => {
    sweepDeadLetterJobs().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[deadLetter] sweep failed', err.message);
    });
  }, SWEEP_INTERVAL_MS);
  interval.unref?.();
  return interval;
}
