import { Worker } from 'bullmq';
import { config } from '../../config/index.js';
import { adsBillingCollectQueue } from '../queues/index.js';
import { collectOutstandingSpendForAllAccounts } from '../../modules/ads/adBilling.service.js';

const connection = { url: config.redis.url };
const REPEAT_EVERY_MS = 24 * 60 * 60 * 1000; // once a day — real invoices, not spammy micro-charges
const JOB_ID = 'ads-billing-collect-repeat';

export const adsBillingCollectWorker = new Worker(
  'ads-billing-collect',
  async () => {
    const results = await collectOutstandingSpendForAllAccounts();
    return { accountsProcessed: results.length };
  },
  { connection, concurrency: 1 }
);

adsBillingCollectWorker.on('failed', (job, err) => {
  // eslint-disable-next-line no-console
  console.error(`[worker] ads-billing-collect job ${job?.id} failed`, err.message);
});

/** Idempotent across worker restarts/replicas — see scheduledPosts.worker.js for the same pattern. */
export async function scheduleAdsBillingCollect() {
  await adsBillingCollectQueue.upsertJobScheduler(
    JOB_ID,
    { every: REPEAT_EVERY_MS },
    { name: 'collect-outstanding-spend', opts: { removeOnComplete: { count: 30 }, removeOnFail: { count: 30 } } }
  );
}
