import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './projects.service.js';

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
  'cover_image_url',
  'category',
  'status',
  'skills_needed',
  'location',
  'is_remote',
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

export const createHandler = asyncHandler(async (req, res) => {
  const fields = pickWritableFields(req.body);
  const slug = `${slugify(fields.title || 'project')}-${Date.now().toString(36)}`;
  // Projects are owned by the authenticated user creating them — no
  // workspace/company posting flow exists yet for this minimal domain.
  const record = await service.create({
    ...fields,
    slug,
    owner_type: 'user',
    owner_id: req.user.sub,
  });
  res.status(201).json({ data: record });
});
