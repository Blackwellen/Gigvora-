import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

export async function list(recruiterId, candidateId) {
  return db('candidate_notes')
    .where({ recruiter_id: recruiterId, candidate_id: candidateId })
    .orderBy([{ column: 'is_pinned', order: 'desc' }, { column: 'created_at', order: 'desc' }]);
}

export async function create(recruiterId, { candidate_id, body, is_pinned } = {}) {
  if (!candidate_id) throw new AppError('candidate_id is required', 422);
  if (!body?.trim()) throw new AppError('body is required', 422);
  const candidate = await db('users').where({ id: candidate_id, account_type: 'individual' }).first('id');
  if (!candidate) throw new AppError('Candidate not found', 404);

  const [row] = await db('candidate_notes')
    .insert({ recruiter_id: recruiterId, candidate_id, body: body.trim(), is_pinned: !!is_pinned })
    .returning('*');
  return row;
}

export async function update(recruiterId, id, { body, is_pinned } = {}) {
  const patch = {};
  if (body !== undefined) {
    if (!body?.trim()) throw new AppError('body cannot be empty', 422);
    patch.body = body.trim();
  }
  if (is_pinned !== undefined) patch.is_pinned = !!is_pinned;
  if (!Object.keys(patch).length) throw new AppError('Nothing to update', 422);

  const [row] = await db('candidate_notes').where({ id, recruiter_id: recruiterId }).update(patch).returning('*');
  if (!row) throw new AppError('Note not found', 404);
  return row;
}

export async function remove(recruiterId, id) {
  const count = await db('candidate_notes').where({ id, recruiter_id: recruiterId }).del();
  if (!count) throw new AppError('Note not found', 404);
}
