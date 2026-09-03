import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './public-directory.service.js';

function pagination(query) {
  return { limit: query.limit ? Number(query.limit) : undefined, offset: query.offset ? Number(query.offset) : undefined };
}

// ---- Talent ----
export const listTalentHandler = asyncHandler(async (req, res) => {
  const { q, role, location, industry, sort } = req.query;
  const result = await service.listTalent({
    q,
    role,
    location,
    industry,
    availableOnly: req.query.availableOnly === 'true',
    skills: req.query.skills ? String(req.query.skills).split(',').filter(Boolean) : undefined,
    sort,
    ...pagination(req.query),
  });
  res.json({ data: result.items, meta: { total: result.total } });
});

export const listFeaturedTalentHandler = asyncHandler(async (req, res) => {
  const items = await service.listFeaturedTalent(Number(req.query.limit) || 3);
  res.json({ data: items });
});

export const getTalentBySlugHandler = asyncHandler(async (req, res) => {
  const profile = await service.getTalentBySlug(req.params.slug);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  res.json({ data: profile });
});

// ---- Companies ----
export const listCompaniesHandler = asyncHandler(async (req, res) => {
  const { q, industry, size, sort } = req.query;
  const result = await service.listCompanies({ q, industry, size, sort, ...pagination(req.query) });
  res.json({ data: result.items, meta: { total: result.total } });
});

export const listFeaturedCompaniesHandler = asyncHandler(async (req, res) => {
  const items = await service.listFeaturedCompanies(Number(req.query.limit) || 4);
  res.json({ data: items });
});

export const getCompanyBySlugHandler = asyncHandler(async (req, res) => {
  const company = await service.getCompanyBySlug(req.params.slug);
  if (!company) return res.status(404).json({ error: 'Company not found' });
  res.json({ data: company });
});

// ---- Jobs ----
export const listJobsHandler = asyncHandler(async (req, res) => {
  const { q, location, workMode, employmentType, industry, companySize, postedSince, sort } = req.query;
  const result = await service.listJobsPublic({
    q,
    location,
    workMode,
    employmentType,
    industry,
    companySize,
    postedSince,
    salaryMin: req.query.salaryMin ? Number(req.query.salaryMin) : undefined,
    sort,
    ...pagination(req.query),
  });
  res.json({ data: result.items, meta: { total: result.total } });
});

export const getJobBySlugHandler = asyncHandler(async (req, res) => {
  const job = await service.getJobBySlug(req.params.slug);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  const similar = await service.listSimilarJobs(job.id, job.company.slug, 3);
  res.json({ data: { ...job, similarJobs: similar } });
});

// ---- Posts ----
export const getPostByIdHandler = asyncHandler(async (req, res) => {
  const post = await service.getPublicPostById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const related = await service.listRelatedPosts(post.author.id, post.id, 3);
  res.json({ data: { ...post, relatedPosts: related } });
});
