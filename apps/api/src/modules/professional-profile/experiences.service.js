import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { emitEvent } from '../../common/events/outbox.js';
import { getOwnProfileId, recomputeCompleteness } from './shared.js';

export async function list(userId) {
  const profileId = await getOwnProfileId(userId);
  const rows = await db('experiences').where({ profile_id: profileId }).orderBy([{ column: 'is_current', order: 'desc' }, { column: 'start_date', order: 'desc' }]);
  const companyIds = rows.map((r) => r.company_id).filter(Boolean);
  const companies = companyIds.length
    ? await db('companies').whereIn('id', companyIds).select('id', 'name', 'logo_url', 'location', 'employee_count')
    : [];
  const companyById = Object.fromEntries(companies.map((c) => [c.id, c]));

  const allSkillIds = [...new Set(rows.flatMap((r) => r.skill_ids || []))];
  const skillRows = allSkillIds.length ? await db('skills').whereIn('id', allSkillIds).select('id', 'canonical_name') : [];
  const skillById = Object.fromEntries(skillRows.map((s) => [s.id, s.canonical_name]));

  return rows.map((r) => ({
    ...r,
    company: r.company_id ? companyById[r.company_id] || null : null,
    skills: (r.skill_ids || []).filter((id) => skillById[id]).map((id) => ({ id, name: skillById[id] })),
  }));
}

async function resolveCompany(companyName, explicitCompanyId) {
  // The Experience form's company picker (companySuggestions.service.js)
  // passes the chosen suggestion's id directly — trust that over a re-match
  // on name, since the user picked it from a real list rather than us
  // guessing from free text.
  if (explicitCompanyId) {
    const byId = await db('companies').where({ id: explicitCompanyId }).first('id', 'name');
    if (byId) return { companyId: byId.id, orgName: byId.name };
  }
  if (!companyName) return { companyId: null, orgName: null };
  const match = await db('companies').whereRaw('lower(name) = lower(?)', [companyName.trim()]).first('id', 'name');
  // A name match alone is NOT employment verification (§13) — it only links
  // the canonical Company record for display; verification_status stays
  // 'unverified' unless an explicit employer-verification flow sets it.
  return match ? { companyId: match.id, orgName: match.name } : { companyId: null, orgName: companyName.trim() };
}

export async function create(userId, input) {
  const profileId = await getOwnProfileId(userId);
  if (!input.title) throw new AppError('Title is required', 422);
  if (!input.startDate) throw new AppError('Start date is required', 422);

  const { companyId, orgName } = await resolveCompany(input.orgName, input.companyId);
  const maxOrder = await db('experiences').where({ profile_id: profileId }).max('order_index as m').first();

  const [row] = await db('experiences')
    .insert({
      profile_id: profileId,
      company_id: companyId,
      org_name: orgName,
      title: input.title,
      employment_type: input.employmentType || null,
      location: input.location || null,
      start_date: input.startDate,
      end_date: input.isCurrent ? null : input.endDate || null,
      is_current: Boolean(input.isCurrent),
      description: input.description || null,
      achievements: JSON.stringify(input.achievements || []),
      skill_ids: JSON.stringify(input.skillIds || []),
      visibility: input.visibility || 'public',
      order_index: (maxOrder?.m || 0) + 1,
    })
    .returning('*');

  await recomputeCompleteness(profileId);
  await emitEvent({ aggregateType: 'experience', aggregateId: row.id, eventType: 'experience.created', payload: { profileId } });
  return row;
}

async function requireOwned(profileId, id) {
  const row = await db('experiences').where({ id, profile_id: profileId }).first();
  if (!row) throw new AppError('Experience not found', 404);
  return row;
}

export async function update(userId, id, input) {
  const profileId = await getOwnProfileId(userId);
  await requireOwned(profileId, id);

  const update = {};
  if ('title' in input) update.title = input.title;
  if ('employmentType' in input) update.employment_type = input.employmentType;
  if ('location' in input) update.location = input.location;
  if ('startDate' in input) update.start_date = input.startDate;
  if ('endDate' in input) update.end_date = input.endDate;
  if ('isCurrent' in input) {
    update.is_current = Boolean(input.isCurrent);
    if (input.isCurrent) update.end_date = null;
  }
  if ('description' in input) update.description = input.description;
  if ('achievements' in input) update.achievements = JSON.stringify(input.achievements);
  if ('skillIds' in input) update.skill_ids = JSON.stringify(input.skillIds);
  if ('visibility' in input) update.visibility = input.visibility;
  if ('orgName' in input || 'companyId' in input) {
    const resolved = await resolveCompany(input.orgName, input.companyId);
    update.company_id = resolved.companyId;
    update.org_name = resolved.orgName;
  }

  const [row] = await db('experiences').where({ id }).update(update).returning('*');
  await recomputeCompleteness(profileId);
  await emitEvent({ aggregateType: 'experience', aggregateId: id, eventType: 'experience.updated', payload: { fields: Object.keys(update) } });
  return row;
}

export async function reorder(userId, orderedIds) {
  const profileId = await getOwnProfileId(userId);
  await db.transaction(async (trx) => {
    for (let i = 0; i < orderedIds.length; i += 1) {
      await trx('experiences').where({ id: orderedIds[i], profile_id: profileId }).update({ order_index: i });
    }
  });
  return list(userId);
}

export async function remove(userId, id) {
  const profileId = await getOwnProfileId(userId);
  await requireOwned(profileId, id);
  await db('experiences').where({ id }).del();
  await recomputeCompleteness(profileId);
  await emitEvent({ aggregateType: 'experience', aggregateId: id, eventType: 'experience.deleted', payload: { profileId } });
}
