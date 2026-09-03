import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { requireAuth } from '../../common/middleware/auth.js';
import * as searchService from './search.service.js';
import * as savedSearchesService from './saved-searches.service.js';

export const listSavedSearchesHandler = [
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = await savedSearchesService.list(req.user.sub);
    res.json({ data });
  }),
];

export const createSavedSearchHandler = [
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = await savedSearchesService.create(req.user.sub, req.body);
    res.status(201).json({ data });
  }),
];

export const removeSavedSearchHandler = [
  requireAuth,
  asyncHandler(async (req, res) => {
    await savedSearchesService.remove(req.user.sub, req.params.id);
    res.status(204).send();
  }),
];

const ENTITY_TYPES = ['people', 'companies', 'gigs', 'posts'];

export const searchAllHandler = asyncHandler(async (req, res) => {
  const { q = '', type, limit, offset, location, workMode, sort } = req.query;

  // Backward-compatible default: no `type` (or type=all) returns the same
  // { people, companies, gigs, posts } small-preview shape the top-bar
  // dropdown and the explorer page's "All" tab already rely on.
  if (!type || type === 'all') {
    const results = await searchService.searchAll(q || '', { viewerId: req.user.sub, limit: Number(limit) || undefined });
    return res.json({ data: results });
  }

  if (!ENTITY_TYPES.includes(type)) {
    return res.status(400).json({ error: { message: `Invalid search type "${type}". Expected one of: all, ${ENTITY_TYPES.join(', ')}.` } });
  }

  const paged = await searchService.searchByType(type, q || '', {
    viewerId: req.user.sub,
    limit,
    offset,
    location,
    workMode,
    sort,
  });
  res.json({ data: paged });
});

export const searchJobsHandler = asyncHandler(async (req, res) => {
  const results = await searchService.searchJobs(req.query.q || '');
  res.json({ data: results });
});

export const searchPeopleHandler = asyncHandler(async (req, res) => {
  const results = await searchService.searchPeople(req.query.q || '');
  res.json({ data: results });
});

export const recommendationsHandler = [
  requireAuth,
  asyncHandler(async (req, res) => {
    const recommendations = await searchService.getMlRecommendations(req.user.sub);
    res.json({ data: recommendations });
  }),
];
