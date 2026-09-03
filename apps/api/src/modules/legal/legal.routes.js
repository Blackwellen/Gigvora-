import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './legal.service.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => res.json({ data: await service.listDocuments() }))
);

router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const doc = await service.getDocumentBySlug(req.params.slug);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json({ data: doc });
  })
);

export default router;
