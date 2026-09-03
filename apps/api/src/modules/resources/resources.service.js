import { db } from '../../db/connection.js';

function baseQuery() {
  return db('resource_articles')
    .leftJoin('users', 'users.id', 'resource_articles.author_user_id')
    .select('resource_articles.*', 'users.first_name as author_first_name', 'users.last_name as author_last_name', 'users.headline as author_headline');
}

export async function listPublic({ contentType, q, limit = 20, offset = 0 } = {}) {
  const query = baseQuery().where('resource_articles.status', 'published');
  if (contentType) query.andWhere('resource_articles.content_type', contentType);
  if (q) query.andWhere((b) => b.whereILike('resource_articles.title', `%${q}%`).orWhereILike('resource_articles.summary', `%${q}%`));

  const rows = await query.orderBy('resource_articles.published_at', 'desc').limit(Math.min(limit, 50)).offset(offset);
  return rows.map(toSummary);
}

export async function getFeatured() {
  const row = await baseQuery().where({ 'resource_articles.status': 'published', 'resource_articles.featured': true }).orderBy('resource_articles.published_at', 'desc').first();
  return row ? toDetail(row) : null;
}

export async function getBySlug(slug) {
  const row = await baseQuery().where({ 'resource_articles.slug': slug, 'resource_articles.status': 'published' }).first();
  return row ? toDetail(row) : null;
}

/**
 * Real internal-link recommendations (Domain 02 spec §48), backed by the
 * seo_topic_clusterer's actual cluster assignments — never a hand-guessed
 * "related" list. Falls back to an empty array if this article hasn't been
 * clustered yet (e.g. clustering hasn't run since it was published) rather
 * than fabricating a related-content list.
 */
export async function getRelatedBySlug(slug, limit = 3) {
  const article = await db('resource_articles').where({ slug, status: 'published' }).first();
  if (!article) return [];

  const cluster = await db('content_topic_clusters')
    .where({ content_type: 'resource_article', content_id: article.id })
    .orderBy('cluster_version', 'desc')
    .first();
  if (!cluster) return [];

  const relatedIds = await db('content_topic_clusters')
    .where({ content_type: 'resource_article', cluster_id: cluster.cluster_id, cluster_version: cluster.cluster_version })
    .andWhere('content_id', '!=', article.id)
    .select('content_id');

  if (relatedIds.length === 0) return [];

  const rows = await baseQuery()
    .whereIn('resource_articles.id', relatedIds.map((r) => r.content_id))
    .andWhere('resource_articles.status', 'published')
    .limit(limit);

  return rows.map(toSummary);
}

function authorName(row) {
  return [row.author_first_name, row.author_last_name].filter(Boolean).join(' ') || 'Gigvora Team';
}

function toSummary(row) {
  return {
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    contentType: row.content_type,
    coverImageUrl: row.cover_image_url,
    readMinutes: row.read_minutes,
    featured: row.featured,
    author: { name: authorName(row), headline: row.author_headline },
    publishedAt: row.published_at,
  };
}

function toDetail(row) {
  return { ...toSummary(row), body: row.body };
}
