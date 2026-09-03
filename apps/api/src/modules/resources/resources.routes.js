import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './resources.service.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const items = await service.listPublic({
      contentType: req.query.type || undefined,
      q: req.query.q || undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      offset: req.query.offset ? Number(req.query.offset) : undefined,
    });
    res.json({ data: items });
  })
);

router.get(
  '/featured',
  asyncHandler(async (req, res) => res.json({ data: await service.getFeatured() }))
);

router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const article = await service.getBySlug(req.params.slug);
    if (!article) return res.status(404).json({ error: 'Article not found' });
    res.json({ data: article });
  })
);

router.get(
  '/:slug/related',
  asyncHandler(async (req, res) => {
    const items = await service.getRelatedBySlug(req.params.slug, Number(req.query.limit) || 3);
    res.json({ data: items });
  })
);

export default router;
