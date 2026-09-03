import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

const TABLE = 'connections';

export async function list({ limit = 20, offset = 0 } = {}) {
  return db(TABLE).select('*').orderBy('created_at', 'desc').limit(limit).offset(offset);
}

/**
 * Pending incoming connection requests for a user (i.e. requests addressed
 * to them, not yet accepted/declined). Powers the top-bar network widget.
 */
export async function listPendingForUser(userId, { limit = 8 } = {}) {
  const baseWhere = { [`${TABLE}.addressee_id`]: userId, [`${TABLE}.status`]: 'pending' };

  const rowsQuery = db(TABLE)
    .where(baseWhere)
    .leftJoin('users', 'users.id', `${TABLE}.requester_id`)
    .select(
      `${TABLE}.id`,
      `${TABLE}.requester_id`,
      `${TABLE}.addressee_id`,
      `${TABLE}.status`,
      `${TABLE}.created_at`,
      'users.first_name as requester_first_name',
      'users.last_name as requester_last_name',
      'users.headline as requester_headline'
    )
    .orderBy(`${TABLE}.created_at`, 'desc')
    .limit(Math.min(limit, 50));

  const countQuery = db(TABLE).where(baseWhere).count({ count: '*' });

  const [rows, [{ count }]] = await Promise.all([rowsQuery, countQuery]);
  return { items: rows, total: Number(count) };
}

export async function getById(id) {
  const record = await db(TABLE).where({ id }).first();
  if (!record) throw new AppError('connections not found', 404);
  return record;
}

export async function create(data) {
  const [record] = await db(TABLE).insert(data).returning('*');
  return record;
}

export async function update(id, data) {
  const [record] = await db(TABLE).where({ id }).update(data).returning('*');
  if (!record) throw new AppError('connections not found', 404);
  return record;
}

export async function remove(id) {
  const count = await db(TABLE).where({ id }).del();
  if (!count) throw new AppError('connections not found', 404);
}
