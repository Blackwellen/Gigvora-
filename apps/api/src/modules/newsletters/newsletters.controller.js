import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './newsletters.service.js';
import { assertValidNewsletterPayload, assertValidIssuePayload } from './newsletters.validation.js';

export const createNewsletterHandler = asyncHandler(async (req, res) => {
  assertValidNewsletterPayload(req.body);
  const data = await service.createNewsletter(req.user.sub, req.body);
  res.status(201).json({ data });
});

export const getNewsletterHandler = asyncHandler(async (req, res) => {
  const data = await service.getNewsletterById(req.user.sub, req.params.idOrSlug);
  res.json({ data });
});

export const subscribeHandler = asyncHandler(async (req, res) => {
  const data = await service.subscribeToNewsletter(req.user.sub, req.params.id);
  res.json({ data });
});

export const unsubscribeHandler = asyncHandler(async (req, res) => {
  const data = await service.unsubscribeFromNewsletter(req.user.sub, req.params.id);
  res.json({ data });
});

export const listIssuesHandler = asyncHandler(async (req, res) => {
  const { limit, offset } = req.query;
  const data = await service.listIssues(req.params.id, { limit: Number(limit) || undefined, offset: Number(offset) || undefined });
  res.json({ data });
});

export const createIssueHandler = asyncHandler(async (req, res) => {
  assertValidIssuePayload(req.body);
  const data = await service.createIssue(req.user.sub, req.params.id, req.body);
  res.status(201).json({ data });
});

export const getIssueHandler = asyncHandler(async (req, res) => {
  const data = await service.getIssueDetail(req.user.sub, req.params.issueId);
  res.json({ data });
});

export const getSubscriberGrowthHandler = asyncHandler(async (req, res) => {
  const data = await service.getSubscriberGrowth(req.params.id);
  res.json({ data });
});
