import { Worker } from 'bullmq';
import { config } from '../../config/index.js';
import { trendRecomputeQueue } from '../queues/index.js';
import { recomputeTrendScores } from '../../modules/trending/trending.service.js';

const connection = { url: config.redis.url };

// Domain 05 Phase 5 gap-close (#1): trend_scores used to be recomputed by a
// plain setInterval in server.js, with a comment noting "no existing
// cron/job-scheduler in this codebase". That was wrong even at the time —
// BullMQ is already a dependency, wired up for the imports pipeline and AI
// tasks (see jobs/queues/index.js) — so this replaces the setInterval with a
// proper BullMQ repeatable job, run here in the worker process rather than
// the request-serving api process.
const REPEAT_EVERY_MS = 15 * 60 * 1000; // same cadence the old setInterval used
const JOB_ID = 'trend-recompute-repeat';

export const trendRecomputeWorker = new Worker(
  'trend-recompute',
  async () => {
    await recomputeTrendScores();
  },
  { connection, concurrency: 1 }
);

trendRecomputeWorker.on('failed', (job, err) => {
  // eslint-disable-next-line no-console
  console.error(`[worker] trend-recompute job ${job?.id} failed`, err.message);
});

/**
 * Upserts the single repeatable job. Safe to call on every worker process
 * boot: BullMQ's repeat.jobId makes this idempotent, so multiple worker
 * replicas (or a restart) never create duplicate schedules. Also enqueues
 * one immediate run so trend_scores isn't stale for up to 15 minutes after a
 * fresh deploy — mirroring the old setTimeout(runTrendRecompute, 10_000).
 */
export async function scheduleTrendRecompute() {
  await trendRecomputeQueue.upsertJobScheduler(
    JOB_ID,
    { every: REPEAT_EVERY_MS },
    { name: 'recompute', opts: { removeOnComplete: { count: 20 }, removeOnFail: { count: 20 } } }
  );
  await trendRecomputeQueue.add('recompute-boot', {}, { removeOnComplete: true, removeOnFail: true });
}
