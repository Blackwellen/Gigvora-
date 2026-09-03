import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { recordActivity } from '../activity/activity.service.js';
import { sanitizeContentBlocks, countWords } from '../../security/sanitize.js';
import { getPostById } from '../posts/posts.service.js';

const READING_WPM = 200;

function computeReadingTime(blocks) {
  return Math.max(1, Math.ceil(countWords(blocks) / READING_WPM));
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function assertCanManagePublisher(userId, publisherType, publisherId) {
  if (publisherType === 'profile') {
    if (publisherId !== userId) throw new AppError('You can only manage your own newsletter', 403);
    return;
  }
  if (publisherType === 'company') {
    const membership = await db('company_members')
      .where({ company_id: publisherId, user_id: userId, status: 'active' })
      .whereIn('role', ['owner', 'admin'])
      .first();
    if (!membership) throw new AppError('You do not have permission to manage this company newsletter', 403);
    return;
  }
  throw new AppError('Invalid publisher type', 422);
}

async function hydratePublisher(publisherType, publisherId) {
  if (publisherType === 'company') {
    const company = await db('companies').where({ id: publisherId }).first('id', 'name', 'logo_url');
    return company ? { type: 'company', id: company.id, name: company.name, logoUrl: company.logo_url || null } : null;
  }
  const user = await db('users').where({ id: publisherId }).first('id', 'first_name', 'last_name', 'headline');
  return user ? { type: 'profile', id: user.id, name: `${user.first_name} ${user.last_name}`, headline: user.headline } : null;
}

async function subscriberCount(newsletterId) {
  const [{ count }] = await db('feed_newsletter_subscriptions')
    .where({ newsletter_id: newsletterId })
    .whereNull('unsubscribed_at')
    .count({ count: '*' });
  return Number(count);
}

function mapNewsletterRow(row) {
  return {
    id: row.id,
    publisherType: row.publisher_type,
    publisherId: row.publisher_id,
    title: row.title,
    description: row.description,
    slug: row.slug,
    coverImageUrl: row.cover_image_url,
    status: row.status,
    frequency: row.frequency,
    createdAt: row.created_at,
  };
}

export async function createNewsletter(userId, { publisherType = 'profile', publisherId, title, description = null, coverImageUrl = null, frequency = null } = {}) {
  if (!title?.trim()) throw new AppError('Newsletter title is required', 422);
  const effectivePublisherId = publisherType === 'profile' ? userId : publisherId;
  if (!effectivePublisherId) throw new AppError('publisherId is required for a company newsletter', 422);
  await assertCanManagePublisher(userId, publisherType, effectivePublisherId);

  const base = slugify(title) || 'newsletter';
  let slug = base;
  let suffix = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await db('feed_newsletters').where({ slug }).first()) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }

  const [row] = await db('feed_newsletters')
    .insert({
      publisher_type: publisherType,
      publisher_id: effectivePublisherId,
      title: title.trim(),
      description,
      slug,
      cover_image_url: coverImageUrl,
      frequency,
    })
    .returning('*');

  return getNewsletterById(userId, row.id);
}

export async function getNewsletterById(viewerId, idOrSlug) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
  const row = await db('feed_newsletters')
    .where(isUuid ? { id: idOrSlug } : { slug: idOrSlug })
    .first();
  if (!row) throw new AppError('Newsletter not found', 404);

  const [publisher, count, subscription, issueCount] = await Promise.all([
    hydratePublisher(row.publisher_type, row.publisher_id),
    subscriberCount(row.id),
    viewerId ? db('feed_newsletter_subscriptions').where({ newsletter_id: row.id, user_id: viewerId }).first() : null,
    db('feed_newsletter_issues').where({ newsletter_id: row.id }).count({ count: '*' }).first(),
  ]);

  return {
    ...mapNewsletterRow(row),
    publisher,
    subscriberCount: count,
    issueCount: Number(issueCount?.count || 0),
    isSubscribed: Boolean(subscription && !subscription.unsubscribed_at),
  };
}

/** Idempotent — re-subscribing after an unsubscribe just clears unsubscribed_at rather than erroring on the unique constraint. */
export async function subscribeToNewsletter(userId, newsletterId) {
  const newsletter = await db('feed_newsletters').where({ id: newsletterId }).first();
  if (!newsletter) throw new AppError('Newsletter not found', 404);

  const existing = await db('feed_newsletter_subscriptions').where({ newsletter_id: newsletterId, user_id: userId }).first();
  if (existing) {
    if (existing.unsubscribed_at) {
      await db('feed_newsletter_subscriptions')
        .where({ id: existing.id })
        .update({ unsubscribed_at: null, subscribed_at: db.fn.now(), updated_at: db.fn.now() });
    }
    return { subscribed: true };
  }
  await db('feed_newsletter_subscriptions').insert({ newsletter_id: newsletterId, user_id: userId });
  return { subscribed: true };
}

export async function unsubscribeFromNewsletter(userId, newsletterId) {
  const existing = await db('feed_newsletter_subscriptions').where({ newsletter_id: newsletterId, user_id: userId }).first();
  if (!existing || existing.unsubscribed_at) return { subscribed: false };
  await db('feed_newsletter_subscriptions').where({ id: existing.id }).update({ unsubscribed_at: db.fn.now(), updated_at: db.fn.now() });
  return { subscribed: false };
}

export async function listIssues(newsletterId, { limit = 20, offset = 0 } = {}) {
  const rows = await db('feed_newsletter_issues')
    .where({ newsletter_id: newsletterId })
    .whereNotNull('published_at')
    .orderBy('issue_number', 'desc')
    .limit(limit)
    .offset(offset);
  return rows.map((r) => ({
    id: r.id,
    postId: r.post_id,
    issueNumber: r.issue_number,
    subject: r.subject,
    previewText: r.preview_text,
    publishedAt: r.published_at,
  }));
}

/**
 * Issue detail reuses the exact same visibility + hydration path as a post
 * (getPostById), plus the issue's post_articles content_json rendered by the
 * same block renderer articles use — a newsletter issue IS an article-shaped
 * post under the hood, just also linked from feed_newsletter_issues.
 */
export async function getIssueDetail(viewerId, issueId) {
  const issue = await db('feed_newsletter_issues').where({ id: issueId }).first();
  if (!issue) throw new AppError('Issue not found', 404);

  const [post, articleRow, newsletter] = await Promise.all([
    getPostById(viewerId, issue.post_id),
    db('post_articles').where({ post_id: issue.post_id }).first(),
    getNewsletterById(viewerId, issue.newsletter_id),
  ]);

  const [prev, next, topComment] = await Promise.all([
    db('feed_newsletter_issues')
      .where({ newsletter_id: issue.newsletter_id })
      .andWhere('issue_number', '<', issue.issue_number)
      .whereNotNull('published_at')
      .orderBy('issue_number', 'desc')
      .first('id', 'issue_number', 'subject'),
    db('feed_newsletter_issues')
      .where({ newsletter_id: issue.newsletter_id })
      .andWhere('issue_number', '>', issue.issue_number)
      .whereNotNull('published_at')
      .orderBy('issue_number', 'asc')
      .first('id', 'issue_number', 'subject'),
    db('post_comments')
      .where({ post_id: issue.post_id, parent_comment_id: null })
      .whereNull('deleted_at')
      .orderBy('created_at', 'desc')
      .first(),
  ]);

  let topDiscussion = null;
  if (topComment) {
    const author = await db('users').where({ id: topComment.author_id }).first('id', 'first_name', 'last_name');
    topDiscussion = {
      id: topComment.id,
      body: topComment.content,
      createdAt: topComment.created_at,
      author: author ? { id: author.id, name: `${author.first_name} ${author.last_name}` } : null,
    };
  }

  return {
    id: issue.id,
    postId: issue.post_id,
    newsletterId: issue.newsletter_id,
    issueNumber: issue.issue_number,
    subject: issue.subject,
    previewText: issue.preview_text,
    publishedAt: issue.published_at,
    post,
    article: articleRow
      ? {
          title: articleRow.title,
          subtitle: articleRow.subtitle,
          coverImageUrl: articleRow.cover_image_url,
          contentJson: Array.isArray(articleRow.content_json) ? articleRow.content_json : [],
          readingTimeMinutes: articleRow.reading_time_minutes,
        }
      : null,
    newsletter,
    previousIssue: prev || null,
    nextIssue: next || null,
    topDiscussion,
  };
}

/**
 * Publisher-only. Creates the issue's underlying post (post_type =
 * 'newsletter_issue') + post_articles row (same content_json shape/
 * sanitization as an article) + the feed_newsletter_issues row, all in one
 * transaction. issue_number is the real next number for that newsletter
 * (max + 1), never client-supplied.
 */
export async function createIssue(
  userId,
  newsletterId,
  { subject, previewText = null, contentJson = [], coverImageUrl = null, status = 'published' } = {}
) {
  if (!subject?.trim()) throw new AppError('Issue subject is required', 422);
  const newsletter = await db('feed_newsletters').where({ id: newsletterId }).first();
  if (!newsletter) throw new AppError('Newsletter not found', 404);
  await assertCanManagePublisher(userId, newsletter.publisher_type, newsletter.publisher_id);

  const cleanBlocks = sanitizeContentBlocks(contentJson);
  if (status === 'published' && !cleanBlocks.length) throw new AppError('Issue must have body content before publishing', 422);
  const readingTime = computeReadingTime(cleanBlocks);

  const companyId = newsletter.publisher_type === 'company' ? newsletter.publisher_id : null;

  const result = await db.transaction(async (trx) => {
    const [post] = await trx('posts')
      .insert({
        author_id: userId,
        content: subject.trim(),
        visibility: 'public',
        company_id: companyId,
        post_type: 'newsletter_issue',
        media: '[]',
        status,
      })
      .returning('*');

    await trx('post_articles').insert({
      post_id: post.id,
      title: subject.trim(),
      subtitle: previewText,
      cover_image_url: coverImageUrl,
      content_json: JSON.stringify(cleanBlocks),
      reading_time_minutes: readingTime,
    });

    const { max } = await trx('feed_newsletter_issues').where({ newsletter_id: newsletterId }).max('issue_number as max').first();
    const issueNumber = Number(max || 0) + 1;

    const [issue] = await trx('feed_newsletter_issues')
      .insert({
        newsletter_id: newsletterId,
        post_id: post.id,
        issue_number: issueNumber,
        subject: subject.trim(),
        preview_text: previewText,
        published_at: status === 'published' ? trx.fn.now() : null,
      })
      .returning('*');

    return { post, issue };
  });

  if (result.post.status === 'published') {
    await recordActivity({
      actorUserId: userId,
      verb: 'created',
      objectType: 'post',
      objectId: result.post.id,
      visibility: 'public',
      context: { preview: result.issue.subject },
    });
  }

  return getIssueDetail(userId, result.issue.id);
}

/**
 * Real subscriber growth: subscribed_at rows grouped by day. Only emitted
 * when there's more than one distinct day of data — a single-point "chart"
 * is not a growth trend, so the caller (route) can decide to omit it below
 * that threshold rather than render a flat, meaningless line.
 */
export async function getSubscriberGrowth(newsletterId) {
  const rows = await db('feed_newsletter_subscriptions')
    .where({ newsletter_id: newsletterId })
    .select(db.raw("date_trunc('day', subscribed_at) as day"))
    .count({ count: '*' })
    .groupBy('day')
    .orderBy('day', 'asc');
  return rows.map((r) => ({ day: r.day, count: Number(r.count) }));
}
