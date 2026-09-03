import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './podcasts.service.js';

export const listPublicHandler = asyncHandler(async (req, res) => {
  const { category, limit, offset } = req.query;
  const result = await service.listPublic({
    category: category || undefined,
    limit: limit ? Number(limit) : undefined,
    offset: offset ? Number(offset) : undefined,
  });
  res.json({ data: result.items, meta: { total: result.total } });
});

export const getBySlugHandler = asyncHandler(async (req, res) => {
  const record = await service.getBySlug(req.params.slug);
  res.json({ data: record });
});

// Explicit allow-list — never spread req.body directly into a DB write.
const WRITABLE_FIELDS = [
  'title',
  'description',
  'host_name',
  'cover_image_url',
  'audio_url',
  'category',
  'duration_seconds',
  'published_at',
  'is_published',
];

function pickWritableFields(body) {
  const out = {};
  for (const field of WRITABLE_FIELDS) {
    if (body[field] !== undefined) out[field] = body[field];
  }
  return out;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Podcasts are editorial/curated content, not user-generated posts — only
// platform admins publish episodes, so creation is gated with requireRole
// ('admin') on top of requireAuth in podcasts.routes.js.
export const createHandler = asyncHandler(async (req, res) => {
  const fields = pickWritableFields(req.body);
  const slug = `${slugify(fields.title || 'podcast')}-${Date.now().toString(36)}`;
  const record = await service.create({ ...fields, slug });
  res.status(201).json({ data: record });
});
