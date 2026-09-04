// Domain 26: Machine Learning, Matching, Ranking & Intelligence — the internal ML control-plane
// API. Platform-staff only (super_admin, admin), mirroring the gate used by modules/admin —
// ordinary end users never call this directly; they consume model *outputs* through the owning
// domain's own routes (jobs, CRM, recruiter, etc.), not through here.
import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { requirePlatformRole } from '../../common/middleware/requirePlatformRole.js';
import * as c from './intelligence.controller.js';

const PLATFORM_ML_ROLES = ['super_admin', 'admin'];

const router = Router();
router.use(requireAuth, requirePlatformRole(...PLATFORM_ML_ROLES));

router.get('/overview', c.overviewHandler);

router.get('/models', c.listModelsHandler);
router.post('/models', c.createModelHandler);
router.get('/models/:id', c.getModelHandler);
router.post('/models/:id/versions', c.createVersionHandler);
router.post('/models/:id/versions/:versionId/promote', c.promoteVersionHandler);
router.post('/models/:id/rollback', c.rollbackHandler);

router.get('/evaluations', c.listEvaluationsHandler);
router.post('/evaluations', c.createEvaluationHandler);

router.get('/features', c.listFeaturesHandler);
router.get('/features/:id', c.getFeatureHandler);
router.post('/features/:id/deprecate', c.deprecateFeatureHandler);

router.get('/datasets', c.listDatasetsHandler);
router.post('/datasets', c.createDatasetHandler);

router.get('/embeddings', c.listEmbeddingIndexesHandler);
router.get('/embeddings/search-test', c.searchTestHandler);

router.post('/skills/extract-test', c.extractSkillsTestHandler);
router.post('/cv/parse-test', c.parseCvTestHandler);
router.post('/jobs/parse-test', c.parseJobTestHandler);

router.get('/lead-scoring', c.leadScoringOverviewHandler);
router.get('/candidate-scoring', c.candidateScoringOverviewHandler);
router.get('/opportunity-scoring', c.opportunityScoringOverviewHandler);
router.get('/fraud', c.fraudOverviewHandler);

router.get('/alerts', c.listAlertsHandler);
router.post('/alerts/:id/acknowledge', c.acknowledgeAlertHandler);

router.get('/experiments', c.listExperimentsHandler);

router.get('/audit', c.listAuditHandler);

export default router;
