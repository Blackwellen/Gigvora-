import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

const TABLE = 'notifications';

export async function list(userId, { limit = 20, offset = 0 } = {}) {
  return db(TABLE).where({ user_id: userId }).orderBy('created_at', 'desc').limit(limit).offset(offset);
}

export async function getById(id) {
  const record = await db(TABLE).where({ id }).first();
  if (!record) throw new AppError('notifications not found', 404);
  return record;
}

export async function create(data) {
  const [record] = await db(TABLE).insert(data).returning('*');
  return record;
}

export async function update(id, data) {
  const [record] = await db(TABLE).where({ id }).update(data).returning('*');
  if (!record) throw new AppError('notifications not found', 404);
  return record;
}

export async function remove(id) {
  const count = await db(TABLE).where({ id }).del();
  if (!count) throw new AppError('notifications not found', 404);
}

export async function getUnreadCount(userId) {
  const row = await db(TABLE).where({ user_id: userId, is_read: false }).count('id as count').first();
  return Number(row?.count || 0);
}
