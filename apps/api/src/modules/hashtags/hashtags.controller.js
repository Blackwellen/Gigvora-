import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './hashtags.service.js';

export const getHashtagHandler = asyncHandler(async (req, res) => {
  const data = await service.getHashtagInfo(req.user.sub, req.params.tag);
  res.json({ data });
});

export const listHashtagContentHandler = asyncHandler(async (req, res) => {
  const { contentType, sort, search, cursor, limit } = req.query;
  const data = await service.listHashtagContent(req.user.sub, req.params.tag, { contentType, sort, search, cursor, limit });
  res.json(data);
});

export const getHashtagInsightsHandler = asyncHandler(async (req, res) => {
  const data = await service.getHashtagInsights(req.user.sub, req.params.tag);
  res.json({ data });
});

export const getRelatedHashtagsHandler = asyncHandler(async (req, res) => {
  const data = await service.getRelatedHashtags(req.params.tag);
  res.json({ data });
});

export const getTopContributorsHandler = asyncHandler(async (req, res) => {
  const data = await service.getTopContributors(req.user.sub, req.params.tag);
  res.json({ data });
});

export const followHashtagHandler = asyncHandler(async (req, res) => {
  await service.followHashtag(req.user.sub, req.params.tag);
  res.status(204).send();
});

export const unfollowHashtagHandler = asyncHandler(async (req, res) => {
  await service.unfollowHashtag(req.user.sub, req.params.tag);
  res.status(204).send();
});
