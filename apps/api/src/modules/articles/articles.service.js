import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { recordActivity } from '../activity/activity.service.js';
import { sanitizeContentBlocks, countWords } from '../../security/sanitize.js';
import { getPostById, getOwnedPostById, syncPostHashtags } from '../posts/posts.service.js';
import { screenContent } from '../../common/ml/moderationClient.js';
import { logMlInference } from '../../common/ml/mlInferenceLog.js';

const READING_WPM = 200;

function computeReadingTime(blocks) {
  const words = countWords(blocks);
  return Math.max(1, Math.ceil(words / READING_WPM));
}

function sanitizeTopics(topics) {
  if (!Array.isArray(topics)) return [];
  return [...new Set(topics.map((t) => String(t).trim().replace(/^#/, '')).filter(Boolean))].slice(0, 10);
}

async function assertCanPublishAs(authorId, companyId) {
  if (!companyId) return;
  const membership = await db('company_members').where({ company_id: companyId, user_id: authorId, status: 'active' }).first();
  if (!membership) throw new AppError('You do not have access to this workspace', 403);
}

export async function createArticle(
  authorId,
  { title, subtitle = null, coverImageUrl = null, contentJson = [], visibility = 'public', companyId = null, topics = [], status = 'published' } = {}
) {
  if (!title?.trim()) throw new AppError('Article title is required', 422);
  if (!['public', 'connections', 'private'].includes(visibility)) throw new AppError('Invalid visibility', 422);
  if (!['draft', 'published'].includes(status)) throw new AppError('Invalid status', 422);
  await assertCanPublishAs(authorId, companyId);

  const cleanBlocks = sanitizeContentBlocks(contentJson);
  if (status === 'published' && !cleanBlocks.length) {
    throw new AppError('Article must have body content before publishing', 422);
  }
  const readingTime = computeReadingTime(cleanBlocks);

  // Same synchronous, short-timeout, fail-open moderation screen as
  // posts.service.js#createPost — screens the real article title+body,
  // never blocks publishing on a slow/unavailable ML service.
  let effectiveStatus = status;
  let moderationResult = null;
  if (status === 'published') {
    const plainText = `${title} ${subtitle || ''} ${cleanBlocks.map((b) => b.text || '').join(' ')}`.trim();
    moderationResult = await screenContent({ text: plainText, authorId, objectType: 'article' });
    if (moderationResult?.label === 'hold_for_review') effectiveStatus = 'under_review';
  }

  const result = await db.transaction(async (trx) => {
    const [post] = await trx('posts')
      .insert({
        author_id: authorId,
        content: subtitle || title,
        visibility,
        company_id: companyId || null,
        post_type: 'article',
        media: '[]',
        status: effectiveStatus,
        topics: JSON.stringify(sanitizeTopics(topics)),
      })
      .returning('*');

    if (effectiveStatus === 'under_review') {
      await trx('content_moderation_actions').insert({
        object_type: 'article',
        object_id: post.id,
        action: 'held',
        reason: (moderationResult.reason_codes || []).join(', '),
        actor_type: 'system',
      });
    }

    const [article] = await trx('post_articles')
      .insert({
        post_id: post.id,
        title: title.trim(),
        subtitle: subtitle?.trim() || null,
        cover_image_url: coverImageUrl || null,
        content_json: JSON.stringify(cleanBlocks),
        reading_time_minutes: readingTime,
      })
      .returning('*');

    await syncPostHashtags(trx, post.id, sanitizeTopics(topics));

    return { post, article };
  });

  if (moderationResult) {
    logMlInference({ objectType: 'article', objectId: result.post.id, modelName: 'moderation-screen', modelVersion: moderationResult.model_version, actorId: authorId, output: moderationResult }).catch(() => {});
  }

  if (result.post.status === 'published') {
    await recordActivity({
      actorUserId: authorId,
      verb: 'created',
      objectType: 'post',
      objectId: result.post.id,
      visibility: 'public',
      context: { preview: result.article.title },
    });
  }

  return getArticleByPostId(authorId, result.post.id);
}

function mapArticleRow(row) {
  return {
    id: row.id,
    postId: row.post_id,
    title: row.title,
    subtitle: row.subtitle,
    coverImageUrl: row.cover_image_url,
    contentJson: Array.isArray(row.content_json) ? row.content_json : [],
    readingTimeMinutes: row.reading_time_minutes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getArticleByPostId(viewerId, postId) {
  const post = await getPostById(viewerId, postId);
  if (post.postType !== 'article') throw new AppError('Article not found', 404);
  const row = await db('post_articles').where({ post_id: postId }).first();
  if (!row) throw new AppError('Article not found', 404);
  return { ...post, article: mapArticleRow(row) };
}

/** Owner-only fetch, used by an edit flow — bypasses feed visibility the
 * same way posts.service.getOwnedPostById does for Edit Post. */
export async function getOwnedArticleByPostId(userId, postId) {
  const post = await getOwnedPostById(userId, postId);
  if (post.postType !== 'article') throw new AppError('Article not found', 404);
  const row = await db('post_articles').where({ post_id: postId }).first();
  if (!row) throw new AppError('Article not found', 404);
  return { ...post, article: mapArticleRow(row) };
}

export async function updateArticle(
  userId,
  postId,
  { title, subtitle, coverImageUrl, contentJson, visibility, companyId, topics, status } = {}
) {
  const post = await db('posts').where({ id: postId }).first();
  if (!post || post.deleted_at) throw new AppError('Article not found', 404);
  if (post.post_type !== 'article') throw new AppError('Article not found', 404);
  // Owner-only, mirroring updatePost's ownership check exactly — author_id
  // is always the acting user, companyId is only the "posting as" context.
  if (post.author_id !== userId) throw new AppError('You can only edit your own articles', 403);

  if (companyId !== undefined && companyId) await assertCanPublishAs(userId, companyId);
  if (visibility !== undefined && !['public', 'connections', 'private'].includes(visibility)) {
    throw new AppError('Invalid visibility', 422);
  }
  if (status !== undefined && !['draft', 'published'].includes(status)) throw new AppError('Invalid status', 422);

  const postPatch = { updated_at: db.fn.now() };
  if (visibility !== undefined) postPatch.visibility = visibility;
  if (companyId !== undefined) postPatch.company_id = companyId || null;
  if (topics !== undefined) postPatch.topics = JSON.stringify(sanitizeTopics(topics));
  if (status !== undefined) postPatch.status = status;
  const wasDraft = post.status === 'draft';
  const isPublishing = wasDraft && status === 'published';
  if (isPublishing) postPatch.created_at = db.fn.now();

  const articlePatch = { updated_at: db.fn.now() };
  if (title !== undefined) {
    if (!title.trim()) throw new AppError('Article title is required', 422);
    articlePatch.title = title.trim();
    postPatch.content = title.trim();
  }
  if (subtitle !== undefined) articlePatch.subtitle = subtitle?.trim() || null;
  if (coverImageUrl !== undefined) articlePatch.cover_image_url = coverImageUrl || null;
  let cleanBlocks;
  if (contentJson !== undefined) {
    cleanBlocks = sanitizeContentBlocks(contentJson);
    articlePatch.content_json = JSON.stringify(cleanBlocks);
    articlePatch.reading_time_minutes = computeReadingTime(cleanBlocks);
  }

  if (isPublishing) {
    const existingArticle = await db('post_articles').where({ post_id: postId }).first();
    const effectiveBlocks = cleanBlocks !== undefined ? cleanBlocks : existingArticle?.content_json || [];
    if (!Array.isArray(effectiveBlocks) || !effectiveBlocks.length) {
      throw new AppError('Article must have body content before publishing', 422);
    }
    if (!wasDraft && title === undefined && !existingArticle?.title) {
      throw new AppError('Article title is required before publishing', 422);
    }
  }

  await db.transaction(async (trx) => {
    await trx('posts').where({ id: postId }).update(postPatch);
    await trx('post_articles').where({ post_id: postId }).update(articlePatch);
    if (topics !== undefined) await syncPostHashtags(trx, postId, sanitizeTopics(topics));
  });

  if (isPublishing) {
    const article = await db('post_articles').where({ post_id: postId }).first();
    await recordActivity({ actorUserId: userId, verb: 'created', objectType: 'post', objectId: postId, visibility: 'public', context: { preview: article?.title } });
  }

  return getArticleByPostId(userId, postId);
}

/**
 * Real related-articles query: other published articles by the same author,
 * falling back to plain-tag topic overlap — no recommendation model, no
 * fabricated relevance score.
 */
export async function getRelatedArticles(viewerId, postId, limit = 4) {
  const post = await db('posts').where({ id: postId }).first();
  if (!post) return [];

  const byAuthor = await db('posts as p')
    .join('post_articles as pa', 'pa.post_id', 'p.id')
    .where('p.author_id', post.author_id)
    .andWhere('p.id', '!=', postId)
    .andWhere('p.status', 'published')
    .whereNull('p.deleted_at')
    .orderBy('p.created_at', 'desc')
    .limit(limit)
    .select('p.id as post_id', 'pa.title', 'pa.subtitle', 'pa.cover_image_url', 'pa.reading_time_minutes', 'p.created_at', 'p.author_id');

  let results = byAuthor;
  if (results.length < limit) {
    const topics = Array.isArray(post.topics) ? post.topics : [];
    if (topics.length) {
      const excludeIds = [postId, ...results.map((r) => r.post_id)];
      const byTopic = await db('posts as p')
        .join('post_articles as pa', 'pa.post_id', 'p.id')
        .whereNotIn('p.id', excludeIds)
        .andWhere('p.status', 'published')
        .whereNull('p.deleted_at')
        .andWhereRaw('p.topics \\?| ?::text[]', [topics])
        .orderBy('p.created_at', 'desc')
        .limit(limit - results.length)
        .select('p.id as post_id', 'pa.title', 'pa.subtitle', 'pa.cover_image_url', 'pa.reading_time_minutes', 'p.created_at', 'p.author_id');
      results = [...results, ...byTopic];
    }
  }

  if (!results.length) return [];
  const authors = await db('users')
    .whereIn('id', [...new Set(results.map((r) => r.author_id))])
    .select('id', 'first_name', 'last_name');
  const authorById = Object.fromEntries(authors.map((a) => [a.id, a]));

  return results.map((r) => ({
    postId: r.post_id,
    title: r.title,
    subtitle: r.subtitle,
    coverImageUrl: r.cover_image_url,
    readingTimeMinutes: r.reading_time_minutes,
    createdAt: r.created_at,
    author: authorById[r.author_id] ? { id: r.author_id, name: `${authorById[r.author_id].first_name} ${authorById[r.author_id].last_name}` } : null,
  }));
}
