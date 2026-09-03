import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './groups.service.js';

function parseFilters(query) {
  return {
    q: query.q || undefined,
    category: query.category || undefined,
    industry: query.industry || undefined,
    tags: query.tags ? String(query.tags).split(',').filter(Boolean) : undefined,
    minMembers: query.minMembers ? Number(query.minMembers) : undefined,
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
  const items = await service.listFeatured(Number(req.query.limit) || 5);
  res.json({ data: items });
});

export const getBySlugHandler = asyncHandler(async (req, res) => {
  const group = await service.getPublicBySlug(req.params.slug);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  const related = group.canViewContent ? await service.listRelated(group.id, group.category, 4) : [];
  res.json({ data: { ...group, relatedGroups: related } });
});

// Explicit allow-list — never spread req.body directly into a DB write.
// Without this, a caller could set member_count directly.
const WRITABLE_FIELDS = ['name', 'description', 'category', 'industry', 'cover_url', 'icon_url', 'tags', 'visibility'];

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
