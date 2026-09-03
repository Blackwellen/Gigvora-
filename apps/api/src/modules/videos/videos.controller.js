import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './videos.service.js';

function parseFilters(query) {
  return {
    q: query.q || undefined,
    category: query.category || undefined,
    topic: query.topic || undefined,
    minDuration: query.minDuration ? Number(query.minDuration) : undefined,
    maxDuration: query.maxDuration ? Number(query.maxDuration) : undefined,
    sort: query.sort || undefined,
    limit: query.limit ? Number(query.limit) : undefined,
    offset: query.offset ? Number(query.offset) : undefined,
  };
}

export const listPublicHandler = asyncHandler(async (req, res) => {
  const result = await service.listPublic(parseFilters(req.query));
  res.json({ data: result.items, meta: { total: result.total } });
});

export const listMineHandler = asyncHandler(async (req, res) => {
  const items = await service.listMine(req.user.sub, { limit: Number(req.query.limit) || undefined, offset: Number(req.query.offset) || undefined });
  res.json({ data: items });
});

export const listFeaturedHandler = asyncHandler(async (req, res) => {
  const items = await service.listFeatured(Number(req.query.limit) || 1);
  res.json({ data: items });
});

export const getBySlugHandler = asyncHandler(async (req, res) => {
  const video = await service.getPublicBySlug(req.params.slug);
  if (!video) return res.status(404).json({ error: 'Video not found' });
  res.json({ data: video });
});

export const trackViewHandler = asyncHandler(async (req, res) => {
  const video = await service.getPublicBySlug(req.params.slug);
  if (!video) return res.status(404).json({ error: 'Video not found' });
  await service.incrementViewCount(video.id);
  res.status(204).send();
});

// Explicit allow-list — never spread req.body directly into a DB write.
// Without this, a caller could set view_count/featured directly.
const WRITABLE_FIELDS = [
  'company_id',
  'title',
  'description',
  'category',
  'topic',
  'thumbnail_url',
  'playback_url',
  'duration_seconds',
  'status',
];

function pickWritableFields(body) {
  const out = {};
  for (const field of WRITABLE_FIELDS) {
    if (body[field] !== undefined) out[field] = body[field];
  }
  return out;
}

export const createHandler = asyncHandler(async (req, res) => {
  const record = await service.create({ ...pickWritableFields(req.body), created_by: req.user.sub });
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
