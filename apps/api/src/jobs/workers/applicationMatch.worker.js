import { Worker } from 'bullmq';
import { config } from '../../config/index.js';
import { db } from '../../db/connection.js';

const connection = { url: config.redis.url };

export const applicationMatchWorker = new Worker(
  'application-match',
  async (job) => {
    const { applicationId } = job.data;
    const application = await db('applications').where({ id: applicationId }).first();
    if (!application) return;

    // A bounded timeout so an unreachable/hung ml-service fails this job fast
    // (BullMQ retries it per its backoff config) instead of holding a worker
    // concurrency slot open indefinitely and backing up the whole queue.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    let response;
    try {
      response = await fetch(`${config.mlService.url}/api/v1/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.mlService.apiKey}` },
        body: JSON.stringify({ applicationId, jobId: application.job_id, applicantId: application.applicant_id }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) throw new Error(`ML service responded with ${response.status}`);
    const { matchScore, insights } = await response.json();

    await db('applications')
      .where({ id: applicationId })
      .update({ match_score: matchScore, ml_insights: JSON.stringify(insights || {}) });
  },
  { connection }
);

applicationMatchWorker.on('failed', (job, err) => {
  // eslint-disable-next-line no-console
  console.error(`[worker] application-match job ${job?.id} failed`, err.message);
});
