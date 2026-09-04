import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { AppError } from '../../common/errors/AppError.js';
import * as profileService from './profile.service.js';
import * as experiences from './experiences.service.js';
import * as companySuggestions from './companySuggestions.service.js';
import * as skills from './skills.service.js';
import * as education from './education.service.js';
import * as certifications from './certifications.service.js';
import * as portfolio from './portfolio.service.js';
import * as offerings from './offerings.service.js';
import * as recommendations from './recommendations.service.js';
import * as reviews from './reviews.service.js';
import * as availability from './availability.service.js';
import * as analytics from './analytics.service.js';
import * as insights from './insights.service.js';
import { secureUpload } from './uploads.js';
import { getOwnProfileId } from './shared.js';

const h = (fn) => asyncHandler(async (req, res) => res.json({ data: await fn(req, res) }));

// --- Hero / About -------------------------------------------------------
export const getHeroHandler = h((req) => profileService.getHero(req.user.sub));
export const updateAboutHandler = h((req) => profileService.updateAbout(req.user.sub, req.body));
export const updateAvailabilityStatusHandler = h((req) => profileService.updateAvailabilitySummary(req.user.sub, req.body));

export const uploadCoverHandler = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No file provided', 422);
  const { url } = await secureUpload(req.file, { kind: 'image', folder: 'cover', userId: req.user.sub });
  res.status(201).json({ data: await profileService.setCoverUrl(req.user.sub, url) });
});
export const removeCoverHandler = h((req) => profileService.removeCover(req.user.sub));

export const uploadAvatarHandler = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No file provided', 422);
  const { url } = await secureUpload(req.file, { kind: 'image', folder: 'avatar', userId: req.user.sub });
  res.status(201).json({ data: await profileService.setAvatarUrl(req.user.sub, url) });
});

export const recordViewHandler = asyncHandler(async (req, res) => {
  const profileId = await getOwnProfileId(req.body.ownerUserId || req.user.sub).catch(() => null);
  if (!profileId) return res.status(204).end();
  const result = await profileService.recordProfileView(profileId, { viewerId: req.user.sub, source: req.body.source });
  res.json({ data: result });
});

// --- Experience -----------------------------------------------------------
export const listExperiencesHandler = h((req) => experiences.list(req.user.sub));
export const createExperienceHandler = h((req) => experiences.create(req.user.sub, req.body));
export const searchCompaniesHandler = h((req) => companySuggestions.searchCompanies(req.query.q, req.query.limit ? Number(req.query.limit) : undefined));
export const resolveSkillHandler = h((req) => skills.resolveSkill(req.body.name));
export const updateExperienceHandler = h((req) => experiences.update(req.user.sub, req.params.id, req.body));
export const reorderExperiencesHandler = h((req) => experiences.reorder(req.user.sub, req.body.orderedIds));
export const deleteExperienceHandler = asyncHandler(async (req, res) => {
  await experiences.remove(req.user.sub, req.params.id);
  res.status(204).end();
});

// --- Skills -----------------------------------------------------------
export const listSkillsHandler = h((req) => skills.list(req.user.sub));
export const searchSkillsHandler = h((req) => skills.searchSkills(req.query.q));
export const addSkillHandler = h((req) => skills.add(req.user.sub, req.body));
export const updateSkillHandler = h((req) => skills.update(req.user.sub, req.params.id, req.body));
export const reorderSkillsHandler = h((req) => skills.reorder(req.user.sub, req.body.orderedIds));
export const suggestSkillsHandler = h((req) => skills.suggestSkills(req.user.sub));
export const deleteSkillHandler = asyncHandler(async (req, res) => {
  await skills.remove(req.user.sub, req.params.id);
  res.status(204).end();
});

// --- Education -----------------------------------------------------------
export const listEducationHandler = h((req) => education.list(req.user.sub));
export const createEducationHandler = h((req) => education.create(req.user.sub, req.body));
export const updateEducationHandler = h((req) => education.update(req.user.sub, req.params.id, req.body));
export const deleteEducationHandler = asyncHandler(async (req, res) => {
  await education.remove(req.user.sub, req.params.id);
  res.status(204).end();
});

// --- Certifications --------------------------------------------------------
export const listCertificationsHandler = h((req) => certifications.list(req.user.sub));
export const createCertificationHandler = h((req) => certifications.create(req.user.sub, req.body));
export const updateCertificationHandler = h((req) => certifications.update(req.user.sub, req.params.id, req.body));
export const deleteCertificationHandler = asyncHandler(async (req, res) => {
  await certifications.remove(req.user.sub, req.params.id);
  res.status(204).end();
});
export const uploadCertificationAssetHandler = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No file provided', 422);
  const isDoc = req.file.mimetype === 'application/pdf';
  const result = await secureUpload(req.file, { kind: isDoc ? 'document' : 'image', folder: 'certifications', userId: req.user.sub });
  res.status(201).json({ data: result });
});

// --- Portfolio -----------------------------------------------------------
export const listPortfolioHandler = h((req) => portfolio.list(req.user.sub, { status: req.query.status }));
export const createPortfolioHandler = h((req) => portfolio.create(req.user.sub, req.body));
export const updatePortfolioHandler = h((req) => portfolio.update(req.user.sub, req.params.id, req.body));
export const reorderPortfolioHandler = h((req) => portfolio.reorder(req.user.sub, req.body.orderedIds));
export const deletePortfolioHandler = asyncHandler(async (req, res) => {
  await portfolio.remove(req.user.sub, req.params.id);
  res.status(204).end();
});
export const uploadPortfolioAssetHandler = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No file provided', 422);
  const isDoc = req.file.mimetype === 'application/pdf';
  const result = await secureUpload(req.file, { kind: isDoc ? 'document' : 'image', folder: 'portfolio', userId: req.user.sub });
  res.status(201).json({ data: result });
});
export const addPortfolioAssetHandler = h((req) => portfolio.addAsset(req.user.sub, req.params.id, req.body));
export const removePortfolioAssetHandler = asyncHandler(async (req, res) => {
  await portfolio.removeAsset(req.user.sub, req.params.id, req.params.assetId);
  res.status(204).end();
});

// --- Services & packages ----------------------------------------------
export const listServicesHandler = h((req) => offerings.list(req.user.sub));
export const createServiceHandler = h((req) => offerings.create(req.user.sub, req.body));
export const updateServiceHandler = h((req) => offerings.update(req.user.sub, req.params.id, req.body));
export const deleteServiceHandler = asyncHandler(async (req, res) => {
  await offerings.remove(req.user.sub, req.params.id);
  res.status(204).end();
});
export const addServicePackageHandler = h((req) => offerings.addPackage(req.user.sub, req.params.id, req.body));
export const updateServicePackageHandler = h((req) => offerings.updatePackage(req.user.sub, req.params.id, req.params.packageId, req.body));
export const deleteServicePackageHandler = asyncHandler(async (req, res) => {
  await offerings.removePackage(req.user.sub, req.params.id, req.params.packageId);
  res.status(204).end();
});

// --- Recommendations -----------------------------------------------------
export const listRecommendationsHandler = h((req) => recommendations.list(req.user.sub));
export const requestRecommendationHandler = h((req) => recommendations.requestRecommendation(req.user.sub, req.body));
export const submitRecommendationHandler = h((req) => recommendations.submitRecommendation(req.user.sub, req.params.profileId, req.body));
export const updateRecommendationVisibilityHandler = h((req) => recommendations.updateVisibility(req.user.sub, req.params.id, req.body.visibility));
export const reportRecommendationHandler = h((req) => recommendations.report(req.user.sub, req.params.id));

// --- Reviews -----------------------------------------------------------
export const listReviewsHandler = h((req) => reviews.list(req.user.sub, req.query));
export const getReviewAggregateHandler = h((req) => reviews.getAggregate(req.user.sub));
export const submitReviewHandler = h((req) => reviews.submitReview(req.user.sub, req.params.profileId, req.body));
export const editReviewHandler = h((req) => reviews.editReview(req.user.sub, req.params.id, req.body));
export const respondToReviewHandler = h((req) => reviews.respondToReview(req.user.sub, req.params.id, req.body.responseText));

// --- Availability -----------------------------------------------------
export const getAvailabilityHandler = h((req) => availability.get(req.user.sub));
export const upsertAvailabilityHandler = h((req) => availability.upsert(req.user.sub, req.body));
export const getMatchReadinessHandler = h((req) => availability.getMatchReadiness(req.user.sub));

// --- Analytics -----------------------------------------------------------
export const getAnalyticsSeriesHandler = h((req) => analytics.getSeries(req.user.sub, { days: req.query.days ? Number(req.query.days) : undefined }));

// --- AI insight rails (deterministic, data-grounded — §71) -----------------
export const getTimelineSummaryHandler = h((req) => insights.getTimelineSummary(req.user.sub));
export const getReviewInsightsHandler = h((req) => insights.getReviewInsights(req.user.sub));
export const getAnalyticsSummaryHandler = h((req) => insights.getAnalyticsSummary(req.user.sub));
