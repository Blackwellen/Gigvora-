import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../../common/middleware/auth.js';
import * as c from './professionalProfile.controller.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const router = Router();
router.use(requireAuth);

// Hero / About / Availability summary
router.get('/me', c.getHeroHandler);
router.patch('/me/about', c.updateAboutHandler);
router.patch('/me/availability-status', c.updateAvailabilityStatusHandler);
router.post('/me/cover', upload.single('file'), c.uploadCoverHandler);
router.delete('/me/cover', c.removeCoverHandler);
router.post('/me/avatar', upload.single('file'), c.uploadAvatarHandler);
router.post('/views', c.recordViewHandler);

// Experience
router.get('/me/experiences', c.listExperiencesHandler);
router.get('/companies/search', c.searchCompaniesHandler);
router.post('/me/experiences', c.createExperienceHandler);
router.patch('/me/experiences/:id', c.updateExperienceHandler);
router.post('/me/experiences/reorder', c.reorderExperiencesHandler);
router.delete('/me/experiences/:id', c.deleteExperienceHandler);

// Skills
router.get('/me/skills', c.listSkillsHandler);
router.get('/skills/search', c.searchSkillsHandler);
router.post('/skills/resolve', c.resolveSkillHandler);
router.get('/me/skills/suggestions', c.suggestSkillsHandler);
router.post('/me/skills', c.addSkillHandler);
router.patch('/me/skills/:id', c.updateSkillHandler);
router.post('/me/skills/reorder', c.reorderSkillsHandler);
router.delete('/me/skills/:id', c.deleteSkillHandler);

// Education
router.get('/me/education', c.listEducationHandler);
router.post('/me/education', c.createEducationHandler);
router.patch('/me/education/:id', c.updateEducationHandler);
router.delete('/me/education/:id', c.deleteEducationHandler);

// Certifications
router.get('/me/certifications', c.listCertificationsHandler);
router.post('/me/certifications', c.createCertificationHandler);
router.patch('/me/certifications/:id', c.updateCertificationHandler);
router.delete('/me/certifications/:id', c.deleteCertificationHandler);
router.post('/me/certifications/assets', upload.single('file'), c.uploadCertificationAssetHandler);

// Portfolio
router.get('/me/portfolio', c.listPortfolioHandler);
router.post('/me/portfolio', c.createPortfolioHandler);
router.patch('/me/portfolio/:id', c.updatePortfolioHandler);
router.post('/me/portfolio/reorder', c.reorderPortfolioHandler);
router.delete('/me/portfolio/:id', c.deletePortfolioHandler);
router.post('/me/portfolio/assets', upload.single('file'), c.uploadPortfolioAssetHandler);
router.post('/me/portfolio/:id/assets', c.addPortfolioAssetHandler);
router.delete('/me/portfolio/:id/assets/:assetId', c.removePortfolioAssetHandler);

// Services & packages
router.get('/me/services', c.listServicesHandler);
router.post('/me/services', c.createServiceHandler);
router.patch('/me/services/:id', c.updateServiceHandler);
router.delete('/me/services/:id', c.deleteServiceHandler);
router.post('/me/services/:id/packages', c.addServicePackageHandler);
router.patch('/me/services/:id/packages/:packageId', c.updateServicePackageHandler);
router.delete('/me/services/:id/packages/:packageId', c.deleteServicePackageHandler);

// Recommendations
router.get('/me/recommendations', c.listRecommendationsHandler);
router.post('/me/recommendations/request', c.requestRecommendationHandler);
router.post('/:profileId/recommendations', c.submitRecommendationHandler);
router.patch('/me/recommendations/:id/visibility', c.updateRecommendationVisibilityHandler);
router.post('/me/recommendations/:id/report', c.reportRecommendationHandler);

// Reviews
router.get('/me/reviews', c.listReviewsHandler);
router.get('/me/reviews/aggregate', c.getReviewAggregateHandler);
router.post('/:profileId/reviews', c.submitReviewHandler);
router.patch('/me/reviews/:id', c.editReviewHandler);
router.post('/me/reviews/:id/response', c.respondToReviewHandler);

// Availability & preferences
router.get('/me/availability', c.getAvailabilityHandler);
router.put('/me/availability', c.upsertAvailabilityHandler);
router.get('/me/match-readiness', c.getMatchReadinessHandler);

// Analytics
router.get('/me/analytics', c.getAnalyticsSeriesHandler);

// AI insight rails
router.get('/me/insights/timeline-summary', c.getTimelineSummaryHandler);
router.get('/me/insights/review-insights', c.getReviewInsightsHandler);
router.get('/me/insights/analytics-summary', c.getAnalyticsSummaryHandler);

export default router;
