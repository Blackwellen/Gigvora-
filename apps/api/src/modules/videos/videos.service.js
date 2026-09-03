import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

const TABLE = 'videos';

function baseQuery() {
  return db(TABLE)
    .leftJoin('users', 'users.id', 'videos.created_by')
    .leftJoin('companies', 'companies.id', 'videos.company_id')
    .select(
      'videos.*',
      'users.first_name as creator_first_name',
      'users.last_name as creator_last_name',
      'companies.name as company_name',
      'companies.slug as company_slug'
    );
}

function applyFilters(query, { q, category, topic, minDuration, maxDuration } = {}) {
  if (q) query.andWhere((b) => b.whereILike('videos.title', `%${q}%`).orWhereILike('videos.description', `%${q}%`));
  if (category && category !== 'all') query.andWhere('videos.category', category);
  if (topic) query.andWhere('videos.topic', topic);
  if (minDuration) query.andWhere('videos.duration_seconds', '>=', minDuration);
  if (maxDuration) query.andWhere('videos.duration_seconds', '<=', maxDuration);
  return query;
}

export async function listPublic({ q, category, topic, minDuration, maxDuration, sort = 'created_at', limit = 20, offset = 0 } = {}) {
  const sortField = ['created_at', 'view_count'].includes(sort) ? sort : 'created_at';

  const query = applyFilters(baseQuery().where('videos.status', 'published'), { q, category, topic, minDuration, maxDuration });
  const countQuery = applyFilters(db(TABLE).where('videos.status', 'published').count({ count: '*' }), {
    q,
    category,
    topic,
    minDuration,
    maxDuration,
  });

  const [rows, [{ count }]] = await Promise.all([
    query.orderBy(`videos.${sortField}`, 'desc').limit(Math.min(limit, 50)).offset(offset),
    countQuery,
  ]);

  return { items: rows.map(toPublicSummary), total: Number(count) };
}

/** Owner's own videos regardless of status — backs Domain 14 §35 Videos tab. */
export async function listMine(userId, { limit = 30, offset = 0 } = {}) {
  const rows = await baseQuery().where('videos.created_by', userId).orderBy('videos.created_at', 'desc').limit(Math.min(limit, 50)).offset(offset);
  return rows.map((row) => ({ ...toPublicSummary(row), status: row.status, description: row.description, playbackUrl: row.playback_url }));
}

export async function listFeatured(limit = 1) {
  const rows = await baseQuery().where({ 'videos.status': 'published', 'videos.featured': true }).orderBy('videos.created_at', 'desc').limit(limit);
  return rows.map(toPublicSummary);
}

export async function getPublicBySlug(slug) {
  const row = await baseQuery().where({ 'videos.slug': slug }).first();
  if (!row) return null;
  return toPublicDetail(row);
}

export async function incrementViewCount(id) {
  await db(TABLE).where({ id }).increment('view_count', 1);
}

function creatorName(row) {
  return [row.creator_first_name, row.creator_last_name].filter(Boolean).join(' ') || null;
}

function toPublicSummary(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    topic: row.topic,
    thumbnailUrl: row.thumbnail_url,
    durationSeconds: row.duration_seconds,
    viewCount: row.view_count,
    featured: row.featured,
    creator: { name: creatorName(row), company: row.company_name ? { name: row.company_name, slug: row.company_slug } : null },
    publishedAt: row.created_at,
  };
}

function toPublicDetail(row) {
  return {
    ...toPublicSummary(row),
    description: row.description,
    playbackUrl: row.playback_url,
  };
}

export async function create(data) {
  const [record] = await db(TABLE).insert(data).returning('*');
  return record;
}

export async function update(id, data) {
  const [record] = await db(TABLE).where({ id }).update(data).returning('*');
  if (!record) throw new AppError('video not found', 404);
  return record;
}

export async function remove(id) {
  const count = await db(TABLE).where({ id }).del();
  if (!count) throw new AppError('video not found', 404);
}
