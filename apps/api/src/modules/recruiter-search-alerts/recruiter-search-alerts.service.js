import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { search as candidateSearch } from '../candidate-search/candidate-search.service.js';

export async function listSavedSearches(recruiterId) {
  return db('recruiter_saved_searches').where({ recruiter_id: recruiterId }).orderBy('created_at', 'desc');
}

export async function createSavedSearch(recruiterId, { name, filters } = {}) {
  if (!name?.trim()) throw new AppError('name is required', 422);
  const [row] = await db('recruiter_saved_searches')
    .insert({ recruiter_id: recruiterId, name: name.trim(), filters: JSON.stringify(filters || {}) })
    .returning('*');
  return row;
}

export async function removeSavedSearch(recruiterId, id) {
  const count = await db('recruiter_saved_searches').where({ id, recruiter_id: recruiterId }).del();
  if (!count) throw new AppError('Saved search not found', 404);
}

export async function list(recruiterId, { status } = {}) {
  const qb = db('recruiter_search_alerts').where({ recruiter_id: recruiterId });
  if (status) qb.andWhere({ status });
  return qb.orderBy('created_at', 'desc');
}

export async function create(recruiterId, { name, filters, frequency, saved_search_id } = {}) {
  if (!name?.trim()) throw new AppError('name is required', 422);
  if (frequency && !['instant', 'daily', 'weekly'].includes(frequency)) throw new AppError('Invalid frequency', 422);
  const [row] = await db('recruiter_search_alerts')
    .insert({
      recruiter_id: recruiterId,
      saved_search_id: saved_search_id || null,
      name: name.trim(),
      filters: JSON.stringify(filters || {}),
      frequency: frequency || 'daily',
    })
    .returning('*');
  return row;
}

export async function update(recruiterId, id, { name, filters, frequency, status } = {}) {
  const patch = {};
  if (name !== undefined) patch.name = name;
  if (filters !== undefined) patch.filters = JSON.stringify(filters);
  if (frequency !== undefined) {
    if (!['instant', 'daily', 'weekly'].includes(frequency)) throw new AppError('Invalid frequency', 422);
    patch.frequency = frequency;
  }
  if (status !== undefined) {
    if (!['active', 'paused'].includes(status)) throw new AppError('Invalid status', 422);
    patch.status = status;
  }
  if (!Object.keys(patch).length) throw new AppError('Nothing to update', 422);

  const [row] = await db('recruiter_search_alerts').where({ id, recruiter_id: recruiterId }).update(patch).returning('*');
  if (!row) throw new AppError('Search alert not found', 404);
  return row;
}

export async function remove(recruiterId, id) {
  const count = await db('recruiter_search_alerts').where({ id, recruiter_id: recruiterId }).del();
  if (!count) throw new AppError('Search alert not found', 404);
}

/**
 * Re-runs the alert's saved filters through the same basic candidate search
 * used by Candidate Search (20.02) — no boolean/NL matching, that stays a
 * Recruiter Pro concern — and records how many results came back.
 */
export async function runNow(recruiterId, id) {
  const alert = await db('recruiter_search_alerts').where({ id, recruiter_id: recruiterId }).first();
  if (!alert) throw new AppError('Search alert not found', 404);

  const result = await candidateSearch(recruiterId, { ...alert.filters, limit: 50 });
  const [row] = await db('recruiter_search_alerts')
    .where({ id })
    .update({ last_run_at: db.fn.now(), new_matches_count: result.total, updated_at: db.fn.now() })
    .returning('*');
  return { alert: row, matches: result.items };
}
