import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { emitEvent } from '../../common/events/outbox.js';
import { getOwnProfileId, recomputeCompleteness } from './shared.js';

export async function list(userId) {
  const profileId = await getOwnProfileId(userId);
  const rows = await db('education').where({ profile_id: profileId }).orderBy([{ column: 'order_index', order: 'asc' }, { column: 'start_date', order: 'desc' }]);
  const institutionIds = rows.map((r) => r.institution_id).filter(Boolean);
  const institutions = institutionIds.length ? await db('companies').whereIn('id', institutionIds).select('id', 'name', 'logo_url') : [];
  const byId = Object.fromEntries(institutions.map((i) => [i.id, i]));
  return rows.map((r) => ({ ...r, institution: r.institution_id ? byId[r.institution_id] || null : null }));
}

async function resolveInstitution(name) {
  if (!name) return { institutionId: null, institutionName: null };
  const match = await db('companies').whereRaw('lower(name) = lower(?)', [name.trim()]).first('id', 'name');
  return match ? { institutionId: match.id, institutionName: match.name } : { institutionId: null, institutionName: name.trim() };
}

export async function create(userId, input) {
  const profileId = await getOwnProfileId(userId);
  if (!input.institutionName) throw new AppError('Institution is required', 422);
  const { institutionId, institutionName } = await resolveInstitution(input.institutionName);
  const maxOrder = await db('education').where({ profile_id: profileId }).max('order_index as m').first();

  const [row] = await db('education')
    .insert({
      profile_id: profileId,
      institution_id: institutionId,
      institution_name: institutionName,
      qualification: input.qualification || null,
      field: input.field || null,
      grade: input.grade || null,
      start_date: input.startDate || null,
      end_date: input.endDate || null,
      description: input.description || null,
      activities: JSON.stringify(input.activities || []),
      visibility: input.visibility || 'public',
      order_index: (maxOrder?.m || 0) + 1,
    })
    .returning('*');

  await recomputeCompleteness(profileId);
  await emitEvent({ aggregateType: 'education', aggregateId: row.id, eventType: 'education.created', payload: { profileId } });
  return row;
}

export async function update(userId, id, input) {
  const profileId = await getOwnProfileId(userId);
  const owned = await db('education').where({ id, profile_id: profileId }).first('id');
  if (!owned) throw new AppError('Education entry not found', 404);

  const patch = {};
  for (const [key, col] of [
    ['qualification', 'qualification'],
    ['field', 'field'],
    ['grade', 'grade'],
    ['startDate', 'start_date'],
    ['endDate', 'end_date'],
    ['description', 'description'],
    ['visibility', 'visibility'],
  ]) {
    if (key in input) patch[col] = input[key];
  }
  if ('activities' in input) patch.activities = JSON.stringify(input.activities);
  if ('institutionName' in input) {
    const resolved = await resolveInstitution(input.institutionName);
    patch.institution_id = resolved.institutionId;
    patch.institution_name = resolved.institutionName;
  }

  const [row] = await db('education').where({ id }).update(patch).returning('*');
  await emitEvent({ aggregateType: 'education', aggregateId: id, eventType: 'education.updated', payload: { fields: Object.keys(patch) } });
  return row;
}

export async function remove(userId, id) {
  const profileId = await getOwnProfileId(userId);
  const owned = await db('education').where({ id, profile_id: profileId }).first('id');
  if (!owned) throw new AppError('Education entry not found', 404);
  await db('education').where({ id }).del();
  await recomputeCompleteness(profileId);
}
