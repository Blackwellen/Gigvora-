import { db } from '../../db/connection.js';
import { config } from '../../config/index.js';

export async function searchJobs(query) {
  return db('jobs')
    .where('status', 'open')
    .andWhere((qb) => {
      qb.whereILike('title', `%${query}%`).orWhereILike('description', `%${query}%`);
    })
    .limit(20);
}

export async function searchPeople(query) {
  return db('users')
    .whereILike('first_name', `%${query}%`)
    .orWhereILike('last_name', `%${query}%`)
    .orWhereILike('headline', `%${query}%`)
    .limit(20)
    .select('id', 'first_name', 'last_name', 'headline', 'account_type');
}

export async function searchCompanies(query) {
  return db('companies')
    .whereILike('name', `%${query}%`)
    .orWhereILike('industry', `%${query}%`)
    .limit(10)
    .select('id', 'name', 'slug', 'logo_url', 'industry');
}

/**
 * Unified, permission-safe cross-entity search for the Command Palette /
 * Universal Search overlays. Every branch selects only public-safe columns
 * (no password_hash etc.) — never SELECT * across an unfiltered join here.
 */
export async function searchAll(query, { limit = 8, viewerId } = {}) {
  if (!query || query.trim().length < 2) {
    return { people: [], companies: [], gigs: [], posts: [] };
  }

  const [people, companies, gigs, posts] = await Promise.all([
    db('users')
      .whereILike('first_name', `%${query}%`)
      .orWhereILike('last_name', `%${query}%`)
      .orWhereILike('headline', `%${query}%`)
      .limit(limit)
      .select('id', 'first_name', 'last_name', 'headline', 'account_type'),
    db('companies').whereILike('name', `%${query}%`).limit(limit).select('id', 'name', 'slug', 'logo_url', 'industry'),
    db('jobs')
      .where('status', 'open')
      .andWhere((qb) => qb.whereILike('title', `%${query}%`).orWhereILike('description', `%${query}%`))
      .limit(limit)
      .select('id', 'title', 'location', 'work_mode', 'employment_type'),
    // Post search stays permission-safe: only public posts or the viewer's own.
    db('posts as p')
      .whereNull('p.deleted_at')
      .andWhere('p.content', 'ilike', `%${query}%`)
      .andWhere((qb) => qb.where('p.visibility', 'public').orWhere('p.author_id', viewerId || null))
      .leftJoin('users as u', 'u.id', 'p.author_id')
      .orderBy('p.created_at', 'desc')
      .limit(limit)
      .select('p.id', 'p.content', 'p.created_at', 'u.first_name', 'u.last_name'),
  ]);

  return { people, companies, gigs, posts };
}

const MAX_TYPE_LIMIT = 50;
const WORK_MODES = ['onsite', 'remote', 'hybrid'];

function paginate(rows, limit, offset) {
  const hasMore = rows.length > limit;
  return { items: hasMore ? rows.slice(0, limit) : rows, limit, offset, hasMore };
}

/**
 * Single-entity, paginated search used by the full explorer page once a tab
 * (people/companies/gigs/posts) is selected. Independent of searchAll(),
 * which stays a small fixed-preview call for the top-bar dropdown and the
 * "All" tab. Fetches `limit + 1` rows to detect `hasMore` without a COUNT.
 */
export async function searchByType(type, query, opts = {}) {
  const trimmed = (query || '').trim();
  const limit = Math.min(Math.max(Number(opts.limit) || 20, 1), MAX_TYPE_LIMIT);
  const offset = Math.max(Number(opts.offset) || 0, 0);
  const empty = { items: [], limit, offset, hasMore: false };
  if (trimmed.length < 2) return empty;

  switch (type) {
    case 'people': {
      const rows = await db('users')
        .whereILike('first_name', `%${trimmed}%`)
        .orWhereILike('last_name', `%${trimmed}%`)
        .orWhereILike('headline', `%${trimmed}%`)
        .orderBy('id')
        .limit(limit + 1)
        .offset(offset)
        .select('id', 'first_name', 'last_name', 'headline', 'account_type');
      return paginate(rows, limit, offset);
    }
    case 'companies': {
      const rows = await db('companies')
        .whereILike('name', `%${trimmed}%`)
        .orWhereILike('industry', `%${trimmed}%`)
        .orderBy('id')
        .limit(limit + 1)
        .offset(offset)
        .select('id', 'name', 'slug', 'logo_url', 'industry');
      return paginate(rows, limit, offset);
    }
    case 'gigs': {
      let qb = db('jobs')
        .where('status', 'open')
        .andWhere((q) => q.whereILike('title', `%${trimmed}%`).orWhereILike('description', `%${trimmed}%`));
      if (opts.location) qb = qb.andWhereILike('location', `%${opts.location}%`);
      if (opts.workMode && WORK_MODES.includes(opts.workMode)) qb = qb.andWhere('work_mode', opts.workMode);
      qb = opts.sort === 'newest' ? qb.orderBy('created_at', 'desc') : qb.orderBy('id');
      const rows = await qb
        .limit(limit + 1)
        .offset(offset)
        .select('id', 'title', 'location', 'work_mode', 'employment_type', 'salary_min', 'salary_max', 'salary_currency', 'created_at');
      return paginate(rows, limit, offset);
    }
    case 'posts': {
      const rows = await db('posts as p')
        .whereNull('p.deleted_at')
        .andWhere('p.content', 'ilike', `%${trimmed}%`)
        .andWhere((qb) => qb.where('p.visibility', 'public').orWhere('p.author_id', opts.viewerId || null))
        .leftJoin('users as u', 'u.id', 'p.author_id')
        .orderBy('p.created_at', 'desc')
        .limit(limit + 1)
        .offset(offset)
        .select('p.id', 'p.content', 'p.created_at', 'p.author_id', 'u.first_name', 'u.last_name');
      return paginate(rows, limit, offset);
    }
    default:
      return empty;
  }
}

const RECOMMENDATIONS_TIMEOUT_MS = 800;
const RECOMMENDATIONS_FALLBACK = { jobs: [], people: [], degraded: true };

/**
 * Same timeout+null-fallback shape as feedRankerClient.js/riskClient.js —
 * this was previously a bare, unguarded fetch() with no timeout and no
 * try/catch, so a slow or unreachable ml-service turned every caller
 * (including GET /search/recommendations, rendered on every onboarding
 * wizard's Opportunity Matches card) into an unhandled 500. A sparse-data
 * empty response from ml-service is already valid JSON and never reaches
 * the catch block; only network failure/timeout/non-2xx does.
 */
export async function getMlRecommendations(userId) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RECOMMENDATIONS_TIMEOUT_MS);
  try {
    const response = await fetch(`${config.mlService.url}/api/v1/recommendations/${userId}`, {
      headers: { Authorization: `Bearer ${config.mlService.apiKey}` },
      signal: controller.signal,
    });
    if (!response.ok) return { ...RECOMMENDATIONS_FALLBACK };
    const data = await response.json();
    return { jobs: [], people: [], ...data, degraded: false };
  } catch {
    return { ...RECOMMENDATIONS_FALLBACK };
  } finally {
    clearTimeout(timeout);
  }
}
