import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

function toCard(row) {
  return {
    id: row.id,
    candidate_id: row.candidate_id,
    name: `${row.first_name} ${row.last_name}`.trim(),
    headline: row.headline || null,
    location: row.location || null,
    avatar_url: row.avatar_url || null,
    open_to_work: !!row.open_to_work,
    note: row.note,
    tags: row.tags || [],
    status: row.status,
    saved_at: row.saved_at,
  };
}

export async function list(recruiterId, { status, limit = 50, offset = 0 } = {}) {
  const build = () => {
    const qb = db('candidate_saves as cs')
      .join('users as u', 'u.id', 'cs.candidate_id')
      .leftJoin('profiles as p', 'p.user_id', 'cs.candidate_id')
      .where('cs.recruiter_id', recruiterId);
    if (status) qb.andWhere('cs.status', status);
    return qb;
  };

  const [rows, [{ count }]] = await Promise.all([
    build()
      .orderBy('cs.saved_at', 'desc')
      .limit(Math.min(Number(limit) || 50, 100))
      .offset(Number(offset) || 0)
      .select('cs.*', 'u.first_name', 'u.last_name', 'u.headline', 'p.location', 'p.avatar_url', 'p.open_to_work'),
    build().count({ count: 'cs.id' }),
  ]);

  return { items: rows.map(toCard), total: Number(count) };
}

export async function save(recruiterId, { candidate_id, note, tags } = {}) {
  if (!candidate_id) throw new AppError('candidate_id is required', 422);
  const candidate = await db('users').where({ id: candidate_id, account_type: 'individual' }).first('id');
  if (!candidate) throw new AppError('Candidate not found', 404);

  const [row] = await db('candidate_saves')
    .insert({ recruiter_id: recruiterId, candidate_id, note: note || null, tags: JSON.stringify(tags || []), status: 'saved' })
    .onConflict(['recruiter_id', 'candidate_id'])
    .merge({ status: 'saved', updated_at: db.fn.now() })
    .returning('*');
  return row;
}

export async function update(recruiterId, id, { note, tags, status } = {}) {
  const patch = {};
  if (note !== undefined) patch.note = note;
  if (tags !== undefined) patch.tags = JSON.stringify(tags);
  if (status !== undefined) {
    if (!['saved', 'contacted', 'archived'].includes(status)) throw new AppError('Invalid status', 422);
    patch.status = status;
  }
  if (!Object.keys(patch).length) throw new AppError('Nothing to update', 422);

  const [row] = await db('candidate_saves').where({ id, recruiter_id: recruiterId }).update(patch).returning('*');
  if (!row) throw new AppError('Saved candidate not found', 404);
  return row;
}

export async function remove(recruiterId, id) {
  const count = await db('candidate_saves').where({ id, recruiter_id: recruiterId }).del();
  if (!count) throw new AppError('Saved candidate not found', 404);
}

export async function unsaveCandidate(recruiterId, candidateId) {
  const count = await db('candidate_saves').where({ recruiter_id: recruiterId, candidate_id: candidateId }).del();
  if (!count) throw new AppError('Saved candidate not found', 404);
}
