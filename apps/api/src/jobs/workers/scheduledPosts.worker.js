import { Worker } from 'bullmq';
import { config } from '../../config/index.js';
import { db } from '../../db/connection.js';
import { scheduledPostsQueue } from '../queues/index.js';
import { screenContent } from '../../common/ml/moderationClient.js';
import { logMlInference } from '../../common/ml/mlInferenceLog.js';
import { recordActivity } from '../../modules/activity/activity.service.js';
import { publishFeedEvent, roomsForPostAudience } from '../../common/events/feedEvents.js';

const connection = { url: config.redis.url };

// Domain 05 Phase 5 gap-close (#1): posts.status has always accepted a
// 'scheduled' value (see posts.service.js createPost/updatePost — a
// future-dated scheduled_at now sets status='scheduled' instead of
// 'published' immediately), but nothing ever flipped it to 'published' when
// scheduled_at arrived. This BullMQ repeatable job is that missing piece.
const REPEAT_EVERY_MS = 60 * 1000; // a post shouldn't sit "due" for more than ~1 minute
const JOB_ID = 'scheduled-posts-publish-repeat';

/**
 * Publishes one due post inside a single transaction using
 * SELECT ... FOR UPDATE SKIP LOCKED, so if this ever runs with more than one
 * worker/replica concurrently, only one of them actually publishes a given
 * row — the other skips it (row already locked) rather than double-firing
 * the activity feed entry / feed:new_candidates realtime event. Re-checking
 * status === 'scheduled' inside the transaction also makes a single worker
 * re-running the sweep idempotent (already-published rows are simply
 * excluded by the WHERE clause on the next sweep).
 */
async function publishOne(postId) {
  let publishedPost = null;
  let moderationResult = null;

  await db.transaction(async (trx) => {
    const post = await trx('posts').where({ id: postId }).whereNull('deleted_at').forUpdate().skipLocked().first();
    if (!post || post.status !== 'scheduled') return; // already handled by another run, or deleted
    if (new Date(post.scheduled_at).getTime() > Date.now()) return; // no longer actually due (shouldn't happen, defensive)

    // Screen at the moment it actually goes live — content or moderation
    // policy may have changed since it was scheduled.
    moderationResult = await screenContent({ text: post.content || '', authorId: post.author_id, objectType: 'post' });
    const effectiveStatus = moderationResult?.label === 'hold_for_review' ? 'under_review' : 'published';

    await trx('posts')
      .where({ id: postId })
      .update({ status: effectiveStatus, created_at: trx.fn.now(), updated_at: trx.fn.now() });

    if (effectiveStatus === 'under_review') {
      await trx('content_moderation_actions').insert({
        object_type: 'post',
        object_id: postId,
        action: 'held',
        reason: (moderationResult.reason_codes || []).join(', '),
        actor_type: 'system',
      });
    }

    publishedPost = { ...post, status: effectiveStatus };
  });

  if (!publishedPost) return;

  if (moderationResult) {
    logMlInference({
      objectType: 'post',
      objectId: postId,
      modelName: 'moderation-screen',
      modelVersion: moderationResult.model_version,
      actorId: publishedPost.author_id,
      output: moderationResult,
    }).catch(() => {});
  }

  // Only a real, currently-live publish gets an activity entry and the
  // realtime "new posts available" nudge — same contract as
  // posts.service.js createPost/updatePost and moderation.service.js
  // approveContent for the immediate-publish and admin-approve paths.
  if (publishedPost.status === 'published') {
    await recordActivity({
      actorUserId: publishedPost.author_id,
      verb: 'created',
      objectType: 'post',
      objectId: postId,
      visibility: 'public',
      context: { preview: (publishedPost.content || '').slice(0, 120) },
    });
    const rooms = await roomsForPostAudience(publishedPost.author_id, publishedPost.visibility);
    await publishFeedEvent('feed:new_candidates', { postId, authorId: publishedPost.author_id }, rooms);
  }
}

export async function publishDueScheduledPosts() {
  const dueRows = await db('posts')
    .where('status', 'scheduled')
    .andWhere('scheduled_at', '<=', db.fn.now())
    .whereNull('deleted_at')
    .select('id');

  for (const { id } of dueRows) {
    // eslint-disable-next-line no-await-in-loop
    await publishOne(id).catch((err) => {
      // eslint-disable-next-line no-console
      console.error(`[scheduled-posts] failed to publish post ${id}`, err.message);
    });
  }

  return dueRows.length;
}

export const scheduledPostsWorker = new Worker(
  'scheduled-posts-publish',
  async () => {
    await publishDueScheduledPosts();
  },
  { connection, concurrency: 1 }
);

scheduledPostsWorker.on('failed', (job, err) => {
  // eslint-disable-next-line no-console
  console.error(`[worker] scheduled-posts-publish job ${job?.id} failed`, err.message);
});

/** Idempotent across worker restarts/replicas — see trendRecompute.worker.js for the same pattern. */
export async function scheduleScheduledPostsPublish() {
  await scheduledPostsQueue.upsertJobScheduler(
    JOB_ID,
    { every: REPEAT_EVERY_MS },
    { name: 'publish-due', opts: { removeOnComplete: { count: 50 }, removeOnFail: { count: 50 } } }
  );
  await scheduledPostsQueue.add('publish-due-boot', {}, { removeOnComplete: true, removeOnFail: true });
}
