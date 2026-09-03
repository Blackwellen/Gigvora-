import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './articles.service.js';
import { assertValidArticlePayload } from './articles.validation.js';

export const createArticleHandler = asyncHandler(async (req, res) => {
  assertValidArticlePayload(req.body);
  const data = await service.createArticle(req.user.sub, req.body);
  res.status(201).json({ data });
});

export const getArticleHandler = asyncHandler(async (req, res) => {
  const data = await service.getArticleByPostId(req.user.sub, req.params.postId);
  res.json({ data });
});

export const getOwnedArticleHandler = asyncHandler(async (req, res) => {
  const data = await service.getOwnedArticleByPostId(req.user.sub, req.params.postId);
  res.json({ data });
});

export const updateArticleHandler = asyncHandler(async (req, res) => {
  assertValidArticlePayload(req.body, { partial: true });
  const data = await service.updateArticle(req.user.sub, req.params.postId, req.body);
  res.json({ data });
});

export const getRelatedArticlesHandler = asyncHandler(async (req, res) => {
  const data = await service.getRelatedArticles(req.user.sub, req.params.postId);
  res.json({ data });
});
