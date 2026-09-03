import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

export async function list(userId) {
  return db('saved_searches').where({ user_id: userId }).orderBy('created_at', 'desc');
}

export async function create(userId, { name, query, filters = {} }) {
  if (!query?.trim()) throw new AppError('Query is required', 422);
  const [row] = await db('saved_searches')
    .insert({ user_id: userId, name: name || query, query, filters: JSON.stringify(filters) })
    .returning('*');
  return row;
}

export async function remove(userId, id) {
  const count = await db('saved_searches').where({ id, user_id: userId }).del();
  if (!count) throw new AppError('Saved search not found', 404);
}
