import { db } from '../../db/connection.js';

export async function listCategories() {
  return db('help_categories').orderBy('order_index', 'asc');
}

export async function listPopularArticles(limit = 5) {
  const rows = await db('help_articles').where({ status: 'published' }).orderBy('view_count', 'desc').limit(limit);
  return rows.map(toSummary);
}

export async function search(query, limit = 20) {
  const rows = await db('help_articles')
    .where({ status: 'published' })
    .andWhere((b) => b.whereILike('title', `%${query}%`).orWhereILike('summary', `%${query}%`).orWhereILike('body', `%${query}%`))
    .orderBy('view_count', 'desc')
    .limit(limit);
  return rows.map(toSummary);
}

export async function listByCategory(categorySlug) {
  const category = await db('help_categories').where({ slug: categorySlug }).first();
  if (!category) return null;
  const articles = await db('help_articles').where({ category_id: category.id, status: 'published' }).orderBy('title', 'asc');
  return { category, articles: articles.map(toSummary) };
}

export async function getArticleBySlug(slug) {
  const row = await db('help_articles').where({ slug, status: 'published' }).first();
  if (!row) return null;
  await db('help_articles').where({ id: row.id }).increment('view_count', 1);
  const category = await db('help_categories').where({ id: row.category_id }).first();
  return { ...toDetail(row), category: category ? { slug: category.slug, name: category.name } : null };
}

export async function submitFeedback({ articleId, helpful, reason, anonymousSessionId, userId }) {
  await db('help_article_feedback').insert({
    article_id: articleId,
    helpful,
    reason: reason || null,
    anonymous_session_id: anonymousSessionId || null,
    user_id: userId || null,
  });
}

function toSummary(row) {
  return { slug: row.slug, title: row.title, summary: row.summary, viewCount: row.view_count };
}

function toDetail(row) {
  return { id: row.id, ...toSummary(row), body: row.body, publishedAt: row.published_at };
}
