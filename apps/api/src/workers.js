import './jobs/workers/applicationMatch.worker.js';
import './jobs/workers/importScan.worker.js';
import './jobs/workers/importSanitize.worker.js';
import './jobs/workers/importParse.worker.js';
import './jobs/workers/importExtract.worker.js';
import './jobs/workers/importMap.worker.js';
import './jobs/workers/importDedupe.worker.js';
import './jobs/workers/importCommit.worker.js';
import './jobs/workers/aiTask.worker.js';
import { startDeadLetterSweeper } from './jobs/deadLetter.js';
import { scheduleTrendRecompute } from './jobs/workers/trendRecompute.worker.js';
import { scheduleScheduledPostsPublish } from './jobs/workers/scheduledPosts.worker.js';
import { scheduleAdsBillingCollect } from './jobs/workers/adsBillingCollect.worker.js';

startDeadLetterSweeper();

// Domain 05 Phase 5 gap-close: replaces the trend_scores setInterval
// (previously in server.js) and adds the missing scheduled-post publish job
// with proper BullMQ repeatable jobs, run in this worker process rather than
// the request-serving api process.
scheduleTrendRecompute().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[workers] failed to schedule trend-recompute repeatable job', err);
});
scheduleScheduledPostsPublish().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[workers] failed to schedule scheduled-posts-publish repeatable job', err);
});
scheduleAdsBillingCollect().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[workers] failed to schedule ads-billing-collect repeatable job', err);
});

// eslint-disable-next-line no-console
console.log('[workers] Gigvora background workers started');
