import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

const TABLE = 'podcasts';

export async function listPublic({ category, limit = 20, offset = 0 } = {}) {
  const query = db(TABLE).where('is_published', true);
  if (category) query.andWhere('category', category);

  const countQuery = db(TABLE).where('is_published', true).modify((qb) => {
    if (category) qb.andWhere('category', category);
  }).count({ count: '*' });

  const [rows, [{ count }]] = await Promise.all([
    query.clone().orderBy('created_at', 'desc').limit(Math.min(limit, 50)).offset(offset),
    countQuery,
  ]);

  return { items: rows, total: Number(count) };
}

export async function getBySlug(slug) {
  const record = await db(TABLE).where({ slug }).first();
  if (!record) throw new AppError('podcast not found', 404);
  return record;
}

export async function create(data) {
  const [record] = await db(TABLE).insert(data).returning('*');
  return record;
}
