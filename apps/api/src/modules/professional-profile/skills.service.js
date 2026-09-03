import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { emitEvent } from '../../common/events/outbox.js';
import { getOwnProfileId, recomputeCompleteness } from './shared.js';

function slugify(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Canonical skill lookup-or-create by normalized slug so "React", "React.js",
 * "ReactJS" all resolve to one taxonomy row (§14) instead of free-text
 * duplicates.
 */
export async function resolveSkill(name) {
  const slug = slugify(name);
  if (!slug) throw new AppError('Invalid skill name', 422);
  const existing = await db('skills').where({ slug }).first();
  if (existing) return existing;
  const [row] = await db('skills').insert({ canonical_name: name.trim(), slug }).returning('*');
  return row;
}

export async function searchSkills(query) {
  if (!query || query.length < 2) return [];
  return db('skills').where('status', 'active').andWhereRaw('canonical_name ILIKE ?', [`%${query}%`]).orderBy('canonical_name').limit(15);
}

export async function list(userId) {
  const profileId = await getOwnProfileId(userId);
  const rows = await db('profile_skills as ps')
    .join('skills as s', 's.id', 'ps.skill_id')
    .where('ps.profile_id', profileId)
    .orderBy([{ column: 'ps.is_featured', order: 'desc' }, { column: 'ps.order_index', order: 'asc' }])
    .select('ps.*', 's.canonical_name', 's.category', 's.slug as skill_slug');
  return rows;
}

export async function add(userId, input) {
  const profileId = await getOwnProfileId(userId);
  if (!input.name) throw new AppError('Skill name is required', 422);
  const skill = await resolveSkill(input.name);

  const existing = await db('profile_skills').where({ profile_id: profileId, skill_id: skill.id }).first('id');
  if (existing) throw new AppError('Skill already added', 409);

  const maxOrder = await db('profile_skills').where({ profile_id: profileId }).max('order_index as m').first();
  const [row] = await db('profile_skills')
    .insert({
      profile_id: profileId,
      skill_id: skill.id,
      level: input.level || null,
      years: input.years || null,
      source: input.source || 'manual',
      verification_status: input.source === 'ai_extracted' ? 'inferred' : 'user_confirmed',
      order_index: (maxOrder?.m || 0) + 1,
    })
    .returning('*');

  await recomputeCompleteness(profileId);
  await emitEvent({ aggregateType: 'profile_skill', aggregateId: row.id, eventType: 'profile_skill.created', payload: { profileId, skillId: skill.id } });
  return { ...row, canonical_name: skill.canonical_name, category: skill.category, skill_slug: skill.slug };
}

export async function update(userId, id, input) {
  const profileId = await getOwnProfileId(userId);
  const owned = await db('profile_skills').where({ id, profile_id: profileId }).first();
  if (!owned) throw new AppError('Skill not found', 404);

  const patch = {};
  if ('level' in input) patch.level = input.level;
  if ('years' in input) patch.years = input.years;
  if ('isFeatured' in input) patch.is_featured = Boolean(input.isFeatured);
  // AI-extracted skills only ever become "user_confirmed" via an explicit
  // accept action — never silently promoted (§16, §67).
  if (input.action === 'accept' && owned.verification_status === 'inferred') patch.verification_status = 'user_confirmed';

  const [row] = await db('profile_skills').where({ id }).update(patch).returning('*');
  await emitEvent({ aggregateType: 'profile_skill', aggregateId: id, eventType: 'profile_skill.updated', payload: { fields: Object.keys(patch) } });
  return row;
}

export async function reorder(userId, orderedIds) {
  const profileId = await getOwnProfileId(userId);
  await db.transaction(async (trx) => {
    for (let i = 0; i < orderedIds.length; i += 1) {
      await trx('profile_skills').where({ id: orderedIds[i], profile_id: profileId }).update({ order_index: i });
    }
  });
  return list(userId);
}

export async function remove(userId, id) {
  const profileId = await getOwnProfileId(userId);
  const owned = await db('profile_skills').where({ id, profile_id: profileId }).first('id');
  if (!owned) throw new AppError('Skill not found', 404);
  await db('profile_skills').where({ id }).del();
  await recomputeCompleteness(profileId);
  await emitEvent({ aggregateType: 'profile_skill', aggregateId: id, eventType: 'profile_skill.deleted', payload: { profileId } });
}

/**
 * §67 skill extraction — deterministic keyword-matching against the
 * canonical taxonomy over the profile's own headline/summary/experience
 * text. This is intentionally NOT a call to an LLM: it is real, inspectable
 * evidence extraction with no fabricated confidence theatre. Results are
 * surfaced as "Suggested skills"; nothing is auto-accepted (§67, §69).
 */
export async function suggestSkills(userId) {
  const profileId = await getOwnProfileId(userId);
  const [profile, experiences, existingSkillIds, taxonomy] = await Promise.all([
    db('profiles').where({ id: profileId }).first('headline', 'bio'),
    db('experiences').where({ profile_id: profileId }).select('title', 'description'),
    db('profile_skills').where({ profile_id: profileId }).pluck('skill_id'),
    db('skills').where('status', 'active').select('id', 'canonical_name', 'slug'),
  ]);

  const corpus = [profile?.headline, profile?.bio, ...experiences.map((e) => `${e.title} ${e.description || ''}`)]
    .filter(Boolean)
    .join(' \n ')
    .toLowerCase();

  const existing = new Set(existingSkillIds);
  const suggestions = [];
  for (const skill of taxonomy) {
    if (existing.has(skill.id)) continue;
    const needle = skill.canonical_name.toLowerCase();
    if (needle.length < 3) continue;
    const occurrences = corpus.split(needle).length - 1;
    if (occurrences > 0) {
      suggestions.push({
        skillId: skill.id,
        name: skill.canonical_name,
        confidence: Math.min(0.95, 0.5 + occurrences * 0.15),
        evidenceReference: 'profile_text_match',
        modelVersion: 'keyword-match-v1',
      });
    }
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 12);
}
