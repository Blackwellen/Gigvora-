import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

const TABLE = 'groups';

function applyFilters(query, { q, category, industry, tags, minMembers } = {}) {
  if (q) query.andWhere((b) => b.whereILike('name', `%${q}%`).orWhereILike('description', `%${q}%`));
  if (category) query.andWhere('category', category);
  if (industry) query.andWhere('industry', industry);
  if (minMembers) query.andWhere('member_count', '>=', minMembers);
  if (Array.isArray(tags) && tags.length) {
    query.andWhere((b) => {
      for (const tag of tags) b.orWhereRaw('tags @> ?::jsonb', [JSON.stringify([tag])]);
    });
  }
  return query;
}

// Public listing only ever surfaces public groups — private-group content
// (discussions, members, resources) never enters this query path.
export async function listPublic({ q, category, industry, tags, minMembers, sort = 'member_count', limit = 20, offset = 0 } = {}) {
  const sortField = ['member_count', 'created_at', 'updated_at'].includes(sort) ? sort : 'member_count';

  const query = applyFilters(db(TABLE).where('visibility', 'public'), { q, category, industry, tags, minMembers });
  const countQuery = applyFilters(db(TABLE).where('visibility', 'public').count({ count: '*' }), {
    q,
    category,
    industry,
    tags,
    minMembers,
  });

  const [rows, [{ count }]] = await Promise.all([
    query.orderBy(sortField, 'desc').limit(Math.min(limit, 50)).offset(offset),
    countQuery,
  ]);

  return { items: rows.map(toPublicSummary), total: Number(count) };
}

export async function listFeatured(limit = 5) {
  const rows = await db(TABLE).where('visibility', 'public').orderBy('member_count', 'desc').limit(limit);
  return rows.map(toPublicSummary);
}

export async function getPublicBySlug(slug) {
  const row = await db(TABLE).where({ slug }).first();
  if (!row) return null;
  // A private group's existence/basic metadata may be acknowledged, but its
  // discussions/members/resources are never returned here.
  const detail = toPublicDetail(row);
  if (detail.canViewContent) {
    const owner = await db('group_members')
      .join('users', 'users.id', 'group_members.user_id')
      .where({ 'group_members.group_id': row.id, 'group_members.role': 'owner' })
      .select('users.id', 'users.first_name', 'users.last_name', 'users.headline')
      .first();
    detail.moderator = owner ? { id: owner.id, name: `${owner.first_name} ${owner.last_name}`.trim(), headline: owner.headline } : null;
  }
  return detail;
}

export async function listRelated(groupId, category, limit = 4) {
  const rows = await db(TABLE)
    .where('visibility', 'public')
    .andWhere('id', '!=', groupId)
    .modify((qb) => {
      if (category) qb.andWhere('category', category);
    })
    .orderBy('member_count', 'desc')
    .limit(limit);
  return rows.map(toPublicSummary);
}

function toPublicSummary(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category,
    industry: row.industry,
    coverUrl: row.cover_url,
    iconUrl: row.icon_url,
    tags: row.tags,
    visibility: row.visibility,
    memberCount: row.member_count,
    createdAt: row.created_at,
  };
}

function toPublicDetail(row) {
  const isPublic = row.visibility === 'public';
  return {
    ...toPublicSummary(row),
    // Detail-only fields are withheld entirely for private groups rather
    // than fetched and hidden client-side.
    canViewContent: isPublic,
  };
}

export async function create(data) {
  const [record] = await db(TABLE).insert(data).returning('*');
  await db('group_members').insert({ group_id: record.id, user_id: data.created_by, role: 'owner' });
  return record;
}

export async function update(id, data) {
  const [record] = await db(TABLE).where({ id }).update(data).returning('*');
  if (!record) throw new AppError('group not found', 404);
  return record;
}

export async function remove(id) {
  const count = await db(TABLE).where({ id }).del();
  if (!count) throw new AppError('group not found', 404);
}
