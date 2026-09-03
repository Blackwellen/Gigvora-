import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

const TABLE = 'job_alerts';
const WRITABLE_FIELDS = ['keywords', 'location', 'remote', 'employment_type', 'category', 'salary_min', 'frequency', 'is_active'];

function pickWritableFields(body = {}) {
  const out = {};
  for (const field of WRITABLE_FIELDS) {
    if (body[field] !== undefined) out[field] = body[field];
  }
  return out;
}

export async function list(userId) {
  return db(TABLE).where({ user_id: userId }).orderBy('created_at', 'desc');
}

export async function create(userId, data) {
  const [record] = await db(TABLE)
    .insert({ ...pickWritableFields(data), user_id: userId })
    .returning('*');
  return record;
}

export async function update(id, userId, data) {
  const [record] = await db(TABLE).where({ id, user_id: userId }).update(pickWritableFields(data)).returning('*');
  if (!record) throw new AppError('job alert not found', 404);
  return record;
}

export async function remove(id, userId) {
  const count = await db(TABLE).where({ id, user_id: userId }).del();
  if (!count) throw new AppError('job alert not found', 404);
}
