import { Queue } from 'bullmq';
import { config } from '../../config/index.js';

const connection = { url: config.redis.url };

export const applicationMatchQueue = new Queue('application-match', { connection });
export const notificationQueue = new Queue('notification-dispatch', { connection });
export const emailQueue = new Queue('email-dispatch', { connection });

// Domain 04 §50: imports pipeline queues. Each stage is its own queue so
// retry/backoff/concurrency can be tuned per stage; workers enqueue the
// next stage themselves on success.
const defaultJobOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: { count: 500 },
  removeOnFail: false, // kept for the dead-letter sweeper to inspect and mark rows failed
};

export const importScanQueue = new Queue('import-scan', { connection, defaultJobOptions });
export const importSanitizeQueue = new Queue('import-sanitize', { connection, defaultJobOptions });
export const importParseQueue = new Queue('import-parse', { connection, defaultJobOptions });
export const importExtractQueue = new Queue('import-extract', { connection, defaultJobOptions });
export const importMapQueue = new Queue('import-map', { connection, defaultJobOptions });
export const importDedupeQueue = new Queue('import-dedupe', { connection, defaultJobOptions });
export const importCommitQueue = new Queue('import-commit', { connection, defaultJobOptions });

// Domain 25: durable AI background tasks (AI Tasks page). Same
// retry/backoff shape as the imports pipeline — a long AI job is never
// modeled as one synchronous HTTP request.
export const aiTaskQueue = new Queue('ai-task', { connection, defaultJobOptions });

// Domain 05 Phase 5 gap-close: recurring jobs, driven by BullMQ's built-in
// repeatable-job scheduler rather than a bare setInterval (BullMQ is already
// a dependency here — see importScan.worker.js et al — so it is reused
// rather than inventing a second scheduling mechanism). Each queue has
// exactly one repeatable job upserted by its worker module at process start
// (jobId keeps upsert idempotent across worker restarts/replicas).
export const trendRecomputeQueue = new Queue('trend-recompute', { connection });
export const scheduledPostsQueue = new Queue('scheduled-posts-publish', { connection });

// Gigvora Ads: daily collection of accrued ad spend into a real Stripe
// invoice per advertiser (see modules/ads/adBilling.service.js). Same
// repeatable-job pattern as the two queues above.
export const adsBillingCollectQueue = new Queue('ads-billing-collect', { connection });
