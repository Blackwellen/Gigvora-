import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { AppError } from '../../common/errors/AppError.js';
import { authRateLimit } from '../../common/middleware/authRateLimit.js';
import * as service from './help-centre.service.js';

const router = Router();

router.get(
  '/categories',
  asyncHandler(async (req, res) => res.json({ data: await service.listCategories() }))
);

router.get(
  '/articles/popular',
  asyncHandler(async (req, res) => res.json({ data: await service.listPopularArticles(Number(req.query.limit) || 5) }))
);

router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ data: [] });
    res.json({ data: await service.search(q, Number(req.query.limit) || 20) });
  })
);

router.get(
  '/categories/:slug',
  asyncHandler(async (req, res) => {
    const result = await service.listByCategory(req.params.slug);
    if (!result) return res.status(404).json({ error: 'Category not found' });
    res.json({ data: result });
  })
);

router.get(
  '/articles/:slug',
  asyncHandler(async (req, res) => {
    const article = await service.getArticleBySlug(req.params.slug);
    if (!article) return res.status(404).json({ error: 'Article not found' });
    res.json({ data: article });
  })
);

router.post(
  '/articles/:slug/feedback',
  authRateLimit({ keyPrefix: 'help-feedback', windowSeconds: 300, max: 20 }),
  asyncHandler(async (req, res) => {
    const article = await service.getArticleBySlug(req.params.slug);
    if (!article) throw new AppError('Article not found', 404);
    if (typeof req.body?.helpful !== 'boolean') throw new AppError('helpful (boolean) is required', 422);
    await service.submitFeedback({
      articleId: article.id,
      helpful: req.body.helpful,
      reason: req.body.reason,
      anonymousSessionId: req.body.anonymousSessionId,
    });
    res.status(201).json({ data: { received: true } });
  })
);

export default router;
