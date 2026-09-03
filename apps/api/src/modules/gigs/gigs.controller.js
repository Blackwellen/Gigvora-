import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { AppError } from '../../common/errors/AppError.js';
import * as service from './gigs.service.js';

function parseFilters(query) {
  return {
    q: query.q || undefined,
    role: query.role || undefined,
    location: query.location || undefined,
    workMode: query.workMode || undefined,
    rateType: query.rateType || undefined,
    rateMin: query.rateMin ? Number(query.rateMin) : undefined,
    rateMax: query.rateMax ? Number(query.rateMax) : undefined,
    experienceLevel: query.experienceLevel || undefined,
    skills: query.skills ? String(query.skills).split(',').filter(Boolean) : undefined,
    postedSince: query.postedSince || undefined,
    sort: query.sort || undefined,
    limit: query.limit ? Number(query.limit) : undefined,
    offset: query.offset ? Number(query.offset) : undefined,
  };
}

export const listPublicHandler = asyncHandler(async (req, res) => {
  const result = await service.listPublic(parseFilters(req.query));
  res.json({ data: result.items, meta: { total: result.total } });
});

export const listFeaturedHandler = asyncHandler(async (req, res) => {
  const items = await service.listFeatured(Number(req.query.limit) || 3);
  res.json({ data: items });
});

export const getBySlugHandler = asyncHandler(async (req, res) => {
  const gig = await service.getPublicBySlug(req.params.slug);
  if (!gig) return res.status(404).json({ error: 'Gig not found' });
  const similar = await service.listSimilar(gig.id, gig.category, 3);
  res.json({ data: { ...gig, similarGigs: similar } });
});

// Explicit allow-list — never spread req.body directly into a DB write.
// Without this, a caller could set status/featured/applicant_count etc.
const WRITABLE_FIELDS = [
  'company_id',
  'title',
  'description',
  'category',
  'rate_type',
  'rate_min',
  'rate_max',
  'rate_currency',
  'duration',
  'location',
  'work_mode',
  'experience_level',
  'skills',
  'deliverables',
  'milestones',
  'status',
  'expires_at',
];

function pickWritableFields(body) {
  const out = {};
  for (const field of WRITABLE_FIELDS) {
    if (body[field] !== undefined) out[field] = body[field];
  }
  return out;
}

export const createHandler = asyncHandler(async (req, res) => {
  const record = await service.create({ ...pickWritableFields(req.body), posted_by: req.user.sub });
  res.status(201).json({ data: record });
});

export const updateHandler = asyncHandler(async (req, res) => {
  const record = await service.update(req.params.id, pickWritableFields(req.body));
  res.json({ data: record });
});

export const removeHandler = asyncHandler(async (req, res) => {
  await service.remove(req.params.id);
  res.status(204).send();
});
