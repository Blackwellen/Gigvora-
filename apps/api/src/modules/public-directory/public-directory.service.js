import { db } from '../../db/connection.js';

// -------------------- Talent Directory (Public Profile projection) --------------------
// Public projection only ever selects fields explicitly safe for anonymous
// discovery. Never select users.email/password_hash/etc. here.
function talentBaseQuery() {
  return db('profiles')
    .join('users', 'users.id', 'profiles.user_id')
    .where('profiles.is_public', true)
    // A profile without a slug has no canonical public URL yet — never
    // surface it in the directory (its card would link nowhere).
    .whereNotNull('profiles.slug')
    .select(
      'profiles.id',
      'profiles.slug',
      'profiles.bio',
      'profiles.location',
      'profiles.industry',
      'profiles.avatar_url',
      'profiles.skills',
      'profiles.open_to_work',
      'profiles.rate_type',
      'profiles.rate_min',
      'profiles.rate_max',
      'profiles.rate_currency',
      'users.first_name',
      'users.last_name',
      'users.headline',
      'users.is_verified'
    );
}

function applyTalentFilters(query, { q, role, location, skills, availableOnly, industry } = {}) {
  if (q) {
    query.andWhere((b) =>
      b
        .whereILike('users.first_name', `%${q}%`)
        .orWhereILike('users.last_name', `%${q}%`)
        .orWhereILike('users.headline', `%${q}%`)
    );
  }
  if (role) query.andWhereILike('users.headline', `%${role}%`);
  if (location) query.andWhereILike('profiles.location', `%${location}%`);
  if (industry) query.andWhere('profiles.industry', industry);
  if (availableOnly) query.andWhere('profiles.open_to_work', true);
  if (Array.isArray(skills) && skills.length) {
    query.andWhere((b) => {
      for (const skill of skills) b.orWhereRaw('profiles.skills @> ?::jsonb', [JSON.stringify([skill])]);
    });
  }
  return query;
}

export async function listTalent(filters = {}) {
  const { sort = 'created_at', limit = 20, offset = 0 } = filters;
  const sortField = ['created_at'].includes(sort) ? `profiles.${sort}` : 'profiles.created_at';

  const query = applyTalentFilters(talentBaseQuery(), filters);
  const countQuery = applyTalentFilters(
    db('profiles')
      .join('users', 'users.id', 'profiles.user_id')
      .where('profiles.is_public', true)
      .whereNotNull('profiles.slug')
      .count({ count: '*' }),
    filters
  );

  const [rows, [{ count }]] = await Promise.all([
    query.orderBy(sortField, 'desc').limit(Math.min(limit, 50)).offset(offset),
    countQuery,
  ]);

  return { items: rows.map(toTalentSummary), total: Number(count) };
}

export async function listFeaturedTalent(limit = 3) {
  const rows = await talentBaseQuery()
    .andWhere('profiles.open_to_work', true)
    .andWhereNotNull('users.headline')
    .orderBy('profiles.created_at', 'desc')
    .limit(limit);
  return rows.map(toTalentSummary);
}

export async function getTalentBySlug(slug) {
  const row = await talentBaseQuery().andWhere('profiles.slug', slug).first();
  if (!row) return null;
  return {
    ...toTalentSummary(row),
    bio: row.bio,
  };
}

function toTalentSummary(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: `${row.first_name} ${row.last_name}`.trim(),
    headline: row.headline,
    location: row.location,
    industry: row.industry,
    avatarUrl: row.avatar_url,
    skills: row.skills,
    verified: row.is_verified,
    availability: row.open_to_work ? 'available' : 'not_available',
    rate: row.rate_min || row.rate_max ? { type: row.rate_type, min: row.rate_min, max: row.rate_max, currency: row.rate_currency } : null,
  };
}

// -------------------- Company Directory (Public Company projection) --------------------
export function companyBaseQuery() {
  return db('companies')
    .leftJoin(
      db('jobs').where('status', 'open').groupBy('company_id').select('company_id').count({ open_jobs: '*' }).as('job_counts'),
      'job_counts.company_id',
      'companies.id'
    )
    .select('companies.*', db.raw('COALESCE(job_counts.open_jobs, 0) as open_jobs_count'));
}

function applyCompanyFilters(query, { q, industry, size } = {}) {
  if (q) query.andWhere((b) => b.whereILike('companies.name', `%${q}%`).orWhereILike('companies.industry', `%${q}%`));
  if (industry) query.andWhere('companies.industry', industry);
  if (size) query.andWhere('companies.size', size);
  return query;
}

export async function listCompanies(filters = {}) {
  const { sort = 'open_jobs_count', limit = 20, offset = 0 } = filters;
  const query = applyCompanyFilters(companyBaseQuery(), filters);
  const countQuery = applyCompanyFilters(db('companies').count({ count: '*' }), filters);

  const sortColumn = sort === 'open_jobs_count' ? 'open_jobs_count' : 'companies.created_at';

  const [rows, [{ count }]] = await Promise.all([
    query.orderBy(sortColumn, 'desc').limit(Math.min(limit, 50)).offset(offset),
    countQuery,
  ]);

  return { items: rows.map(toCompanySummary), total: Number(count) };
}

export async function listFeaturedCompanies(limit = 4) {
  const rows = await companyBaseQuery().orderBy('open_jobs_count', 'desc').limit(limit);
  return rows.map(toCompanySummary);
}

export async function getCompanyBySlug(slug) {
  const row = await companyBaseQuery().andWhere('companies.slug', slug).first();
  if (!row) return null;
  return { ...toCompanySummary(row), description: row.description, website: row.website };
}

export function toCompanySummary(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    logoUrl: row.logo_url,
    industry: row.industry,
    size: row.size,
    openJobsCount: Number(row.open_jobs_count) || 0,
    orgType: row.org_type,
  };
}

// -------------------- Jobs Marketplace (Public Job projection) --------------------
export function jobBaseQuery() {
  return db('jobs')
    .join('companies', 'companies.id', 'jobs.company_id')
    .select(
      'jobs.*',
      'companies.name as company_name',
      'companies.slug as company_slug',
      'companies.logo_url as company_logo_url',
      'companies.industry as company_industry',
      'companies.size as company_size'
    );
}

function applyJobFilters(query, { q, location, workMode, employmentType, salaryMin, industry, companySize, postedSince } = {}) {
  if (q) query.andWhere((b) => b.whereILike('jobs.title', `%${q}%`).orWhereILike('companies.name', `%${q}%`));
  if (location) query.andWhereILike('jobs.location', `%${location}%`);
  if (workMode) query.andWhere('jobs.work_mode', workMode);
  if (employmentType) query.andWhere('jobs.employment_type', employmentType);
  if (salaryMin) query.andWhere('jobs.salary_max', '>=', salaryMin);
  if (industry) query.andWhere('companies.industry', industry);
  if (companySize) query.andWhere('companies.size', companySize);
  if (postedSince) query.andWhere('jobs.created_at', '>=', postedSince);
  return query;
}

export async function listJobsPublic(filters = {}) {
  const { sort = 'created_at', limit = 20, offset = 0 } = filters;
  const query = applyJobFilters(jobBaseQuery().where('jobs.status', 'open'), filters);
  const countQuery = applyJobFilters(
    db('jobs').join('companies', 'companies.id', 'jobs.company_id').where('jobs.status', 'open').count({ count: '*' }),
    filters
  );

  const sortField = sort === 'salary_max' ? 'jobs.salary_max' : 'jobs.created_at';

  const [rows, [{ count }]] = await Promise.all([
    query.orderBy(sortField, 'desc').limit(Math.min(limit, 50)).offset(offset),
    countQuery,
  ]);

  return { items: rows.map(toJobSummary), total: Number(count) };
}

export async function getJobBySlug(slug) {
  const row = await jobBaseQuery().andWhere('jobs.slug', slug).first();
  if (!row) return null;
  return toJobDetail(row);
}

export async function listSimilarJobs(jobId, companyId, limit = 3) {
  const rows = await jobBaseQuery()
    .where('jobs.status', 'open')
    .andWhere('jobs.id', '!=', jobId)
    .orderBy('jobs.created_at', 'desc')
    .limit(limit);
  return rows.map(toJobSummary);
}

export function toJobSummary(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    company: { name: row.company_name, slug: row.company_slug, logoUrl: row.company_logo_url },
    location: row.location,
    employmentType: row.employment_type,
    workMode: row.work_mode,
    salaryMin: row.salary_min,
    salaryMax: row.salary_max,
    salaryCurrency: row.salary_currency,
    skills: row.skills,
    postedAt: row.created_at,
  };
}

function toJobDetail(row) {
  return {
    ...toJobSummary(row),
    description: row.description,
    requirements: row.requirements,
    company: {
      ...toJobSummary(row).company,
      industry: row.company_industry,
      size: row.company_size,
    },
  };
}

// -------------------- Public Post (SEO-safe public feed post projection) --------------------
// The canonical Posts module (apps/api/src/modules/posts) requires auth on
// every route — feed reads are permission-scoped (connections/company
// context). This is a deliberately separate, narrower read path: only posts
// that are explicitly `visibility = 'public'`, published, and not deleted
// are ever returned here, and only public-safe fields are selected. It never
// exposes connections-only or private posts, and never touches the
// authenticated feed's ranking/permission logic.
function postBaseQuery() {
  return db('posts')
    .join('users', 'users.id', 'posts.author_id')
    .leftJoin('companies', 'companies.id', 'posts.company_id')
    .where('posts.visibility', 'public')
    .andWhere('posts.status', 'published')
    .whereNull('posts.deleted_at')
    .select(
      'posts.id',
      'posts.content',
      'posts.media',
      'posts.like_count',
      'posts.comment_count',
      'posts.share_count',
      'posts.topics',
      'posts.created_at',
      'users.id as author_id',
      'users.first_name',
      'users.last_name',
      'users.headline',
      'users.is_verified',
      'companies.name as company_name',
      'companies.slug as company_slug'
    );
}

export async function getPublicPostById(id) {
  const row = await postBaseQuery().andWhere('posts.id', id).first();
  if (!row) return null;

  const attachments = await db('post_attachments')
    .where({ post_id: row.id })
    .orderBy('order_index', 'asc')
    .select('attachment_type', 'url', 'file_name');

  return {
    id: row.id,
    content: row.content,
    topics: row.topics,
    reactions: row.like_count,
    commentCount: row.comment_count,
    shareCount: row.share_count,
    publishedAt: row.created_at,
    author: {
      id: row.author_id,
      name: `${row.first_name} ${row.last_name}`.trim(),
      headline: row.headline,
      verified: row.is_verified,
      company: row.company_name ? { name: row.company_name, slug: row.company_slug } : null,
    },
    attachments: attachments.map((a) => ({ type: a.attachment_type, url: a.url, fileName: a.file_name })),
  };
}

export async function listRelatedPosts(authorId, excludePostId, limit = 3) {
  const rows = await postBaseQuery()
    .andWhere('posts.author_id', authorId)
    .andWhere('posts.id', '!=', excludePostId)
    .orderBy('posts.created_at', 'desc')
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    content: row.content,
    reactions: row.like_count,
    commentCount: row.comment_count,
    publishedAt: row.created_at,
    author: { name: `${row.first_name} ${row.last_name}`.trim() },
  }));
}
