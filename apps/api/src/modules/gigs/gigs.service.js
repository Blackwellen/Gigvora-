import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { isValidProjectCategory } from '../../common/taxonomies/projectCategories.js';
import { isValidCountryCode } from '../../common/taxonomies/countries.js';

const TABLE = 'gigs';
const SORTABLE_FIELDS = new Set(['created_at', 'rate_min', 'rate_max']);

function baseQuery() {
  return db(TABLE)
    .join('companies', 'companies.id', 'gigs.company_id')
    .select(
      'gigs.*',
      'companies.name as company_name',
      'companies.slug as company_slug',
      'companies.logo_url as company_logo_url'
    );
}

function applyFilters(query, filters = {}) {
  const { q, role, location, countryCode, workMode, rateType, rateMin, rateMax, durationMax, experienceLevel, skills, postedSince } = filters;

  if (q) query.andWhere((b) => b.whereILike('gigs.title', `%${q}%`).orWhereILike('gigs.description', `%${q}%`));
  if (role) query.andWhereILike('gigs.title', `%${role}%`);
  if (location) query.andWhereILike('gigs.location', `%${location}%`);
  if (countryCode) query.andWhere('gigs.country_code', String(countryCode).toUpperCase());
  if (workMode) query.andWhere('gigs.work_mode', workMode);
  if (rateType) query.andWhere('gigs.rate_type', rateType);
  if (rateMin) query.andWhere('gigs.rate_max', '>=', rateMin);
  if (rateMax) query.andWhere('gigs.rate_min', '<=', rateMax);
  if (experienceLevel) query.andWhere('gigs.experience_level', experienceLevel);
  if (postedSince) query.andWhere('gigs.created_at', '>=', postedSince);
  if (Array.isArray(skills) && skills.length) {
    query.andWhere((b) => {
      for (const skill of skills) b.orWhereRaw('gigs.skills @> ?::jsonb', [JSON.stringify([skill])]);
    });
  }
  return query;
}

export async function listPublic({
  q,
  role,
  location,
  countryCode,
  workMode,
  rateType,
  rateMin,
  rateMax,
  experienceLevel,
  skills,
  postedSince,
  sort = 'created_at',
  limit = 20,
  offset = 0,
} = {}) {
  const sortField = SORTABLE_FIELDS.has(sort) ? sort : 'created_at';

  const query = applyFilters(baseQuery().where('gigs.status', 'open'), {
    q,
    role,
    location,
    countryCode,
    workMode,
    rateType,
    rateMin,
    rateMax,
    experienceLevel,
    skills,
    postedSince,
  });

  const countQuery = applyFilters(db(TABLE).where('gigs.status', 'open').count({ count: '*' }), {
    q,
    role,
    location,
    countryCode,
    workMode,
    rateType,
    rateMin,
    rateMax,
    experienceLevel,
    skills,
    postedSince,
  });

  const [rows, [{ count }]] = await Promise.all([
    query.orderBy(`gigs.${sortField}`, 'desc').limit(Math.min(limit, 50)).offset(offset),
    countQuery,
  ]);

  return { items: rows.map(toPublicSummary), total: Number(count) };
}

export async function listFeatured(limit = 3) {
  const rows = await baseQuery().where({ 'gigs.status': 'open', 'gigs.featured': true }).orderBy('gigs.created_at', 'desc').limit(limit);
  return rows.map(toPublicSummary);
}

export async function getPublicBySlug(slug) {
  const row = await baseQuery().where({ 'gigs.slug': slug }).first();
  if (!row) return null;
  return toPublicDetail(row);
}

export async function listSimilar(gigId, category, limit = 3) {
  const rows = await baseQuery()
    .where('gigs.status', 'open')
    .andWhere('gigs.id', '!=', gigId)
    .modify((qb) => {
      if (category) qb.andWhere('gigs.category', category);
    })
    .orderBy('gigs.created_at', 'desc')
    .limit(limit);
  return rows.map(toPublicSummary);
}

function toPublicSummary(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    company: { name: row.company_name, slug: row.company_slug, logoUrl: row.company_logo_url },
    category: row.category,
    rateType: row.rate_type,
    rateMin: row.rate_min,
    rateMax: row.rate_max,
    rateCurrency: row.rate_currency,
    duration: row.duration,
    location: row.location,
    workMode: row.work_mode,
    experienceLevel: row.experience_level,
    skills: row.skills,
    featured: row.featured,
    applicantCount: row.applicant_count,
    postedAt: row.created_at,
  };
}

function toPublicDetail(row) {
  return {
    ...toPublicSummary(row),
    description: row.description,
    deliverables: row.deliverables,
    milestones: row.milestones,
  };
}

function validateTaxonomyFields(data) {
  if (data.category !== undefined && data.category !== null && !isValidProjectCategory(data.category)) {
    throw new AppError(`"${data.category}" is not a recognized gig category`, 422, { code: 'INVALID_CATEGORY' });
  }
  if (data.country_code !== undefined && data.country_code !== null && !isValidCountryCode(data.country_code)) {
    throw new AppError(`"${data.country_code}" is not a recognized country code`, 422, { code: 'INVALID_COUNTRY' });
  }
}

export async function create(data) {
  validateTaxonomyFields(data);
  const payload = { ...data };
  if (payload.country_code) payload.country_code = payload.country_code.toUpperCase();
  const [record] = await db(TABLE).insert(payload).returning('*');
  return record;
}

export async function update(id, data) {
  validateTaxonomyFields(data);
  const payload = { ...data };
  if (payload.country_code) payload.country_code = payload.country_code.toUpperCase();
  const [record] = await db(TABLE).where({ id }).update(payload).returning('*');
  if (!record) throw new AppError('gig not found', 404);
  return record;
}

export async function remove(id) {
  const count = await db(TABLE).where({ id }).del();
  if (!count) throw new AppError('gig not found', 404);
}
