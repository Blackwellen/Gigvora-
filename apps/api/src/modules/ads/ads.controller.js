import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { AppError } from '../../common/errors/AppError.js';
import * as accounts from './adAccounts.service.js';
import * as campaigns from './adCampaigns.service.js';
import * as serving from './adServing.service.js';
import * as billing from './adBilling.service.js';

export const getAccountSummaryHandler = asyncHandler(async (req, res) => {
  const data = await accounts.getAccountSummary(req.user.sub);
  res.json({ data });
});

export const listCampaignsHandler = asyncHandler(async (req, res) => {
  const data = await campaigns.listCampaigns(req.user.sub, { status: req.query.status });
  res.json({ data });
});

export const createCampaignHandler = asyncHandler(async (req, res) => {
  const data = await campaigns.createCampaign(req.user.sub, req.body);
  res.status(201).json({ data });
});

export const getCampaignHandler = asyncHandler(async (req, res) => {
  const data = await campaigns.getCampaign(req.user.sub, req.params.id);
  res.json({ data });
});

export const updateCampaignHandler = asyncHandler(async (req, res) => {
  const data = await campaigns.updateCampaign(req.user.sub, req.params.id, req.body);
  res.json({ data });
});

export const submitForReviewHandler = asyncHandler(async (req, res) => {
  const data = await campaigns.submitForReview(req.user.sub, req.params.id);
  res.json({ data });
});

export const pauseCampaignHandler = asyncHandler(async (req, res) => {
  const data = await campaigns.pauseCampaign(req.user.sub, req.params.id);
  res.json({ data });
});

export const resumeCampaignHandler = asyncHandler(async (req, res) => {
  const data = await campaigns.resumeCampaign(req.user.sub, req.params.id);
  res.json({ data });
});

export const serveFeedAdHandler = asyncHandler(async (req, res) => {
  const data = await serving.getSponsoredFeedPost(req.user.sub);
  res.json({ data });
});

export const serveJobAdHandler = asyncHandler(async (req, res) => {
  const data = await serving.getPromotedJob(req.user.sub, { q: req.query.q, location: req.query.location });
  res.json({ data });
});

export const serveCompanyAdHandler = asyncHandler(async (req, res) => {
  const data = await serving.getPromotedCompany(req.user.sub, { q: req.query.q, industry: req.query.industry });
  res.json({ data });
});

export const recordImpressionHandler = asyncHandler(async (req, res) => {
  const { campaignId, creativeId, surface } = req.body;
  if (!campaignId || !creativeId || !surface) throw new AppError('campaignId, creativeId and surface are required', 422);
  await serving.recordImpression({ campaignId, creativeId, viewerId: req.user.sub, surface });
  res.status(204).send();
});

export const recordClickHandler = asyncHandler(async (req, res) => {
  const { campaignId, creativeId, surface } = req.body;
  if (!campaignId || !creativeId || !surface) throw new AppError('campaignId, creativeId and surface are required', 422);
  await serving.recordClick({ campaignId, creativeId, viewerId: req.user.sub, surface });
  res.status(204).send();
});

export const getBillingHistoryHandler = asyncHandler(async (req, res) => {
  const data = await billing.getBillingHistory(req.user.sub, { limit: Number(req.query.limit) || undefined });
  res.json({ data });
});
