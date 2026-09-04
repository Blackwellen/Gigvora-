import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './intelligence.service.js';

export const overviewHandler = asyncHandler(async (req, res) => {
  res.json({ data: await service.getOverview() });
});

export const listModelsHandler = asyncHandler(async (req, res) => {
  const result = await service.listModels(req.query);
  res.json({ data: result.data, meta: { total: result.total } });
});

export const getModelHandler = asyncHandler(async (req, res) => {
  res.json({ data: await service.getModel(req.params.id) });
});

export const createModelHandler = asyncHandler(async (req, res) => {
  const row = await service.createModel(req.user.sub, req.body);
  res.status(201).json({ data: row });
});

export const createVersionHandler = asyncHandler(async (req, res) => {
  const row = await service.createVersion(req.user.sub, req.params.id, req.body);
  res.status(201).json({ data: row });
});

export const promoteVersionHandler = asyncHandler(async (req, res) => {
  const row = await service.promoteVersion(req.user.sub, req.params.id, req.params.versionId, req.body);
  res.json({ data: row });
});

export const rollbackHandler = asyncHandler(async (req, res) => {
  const row = await service.rollback(req.user.sub, req.params.id, req.body);
  res.json({ data: row });
});

export const listEvaluationsHandler = asyncHandler(async (req, res) => {
  const result = await service.listEvaluations(req.query);
  res.json({ data: result.data, meta: { total: result.total } });
});

export const createEvaluationHandler = asyncHandler(async (req, res) => {
  const row = await service.createEvaluation(req.user.sub, req.body);
  res.status(201).json({ data: row });
});

export const listFeaturesHandler = asyncHandler(async (req, res) => {
  const result = await service.listFeatures(req.query);
  res.json({ data: result.data, meta: { total: result.total } });
});

export const getFeatureHandler = asyncHandler(async (req, res) => {
  res.json({ data: await service.getFeature(req.params.id) });
});

export const deprecateFeatureHandler = asyncHandler(async (req, res) => {
  res.json({ data: await service.deprecateFeature(req.params.id) });
});

export const listDatasetsHandler = asyncHandler(async (req, res) => {
  const result = await service.listDatasets(req.query);
  res.json({ data: result.data, meta: { total: result.total } });
});

export const createDatasetHandler = asyncHandler(async (req, res) => {
  const row = await service.createDataset(req.user.sub, req.body);
  res.status(201).json({ data: row });
});

export const listEmbeddingIndexesHandler = asyncHandler(async (req, res) => {
  res.json({ data: await service.listEmbeddingIndexes() });
});

export const searchTestHandler = asyncHandler(async (req, res) => {
  res.json({ data: await service.searchTest(req.query) });
});

export const extractSkillsTestHandler = asyncHandler(async (req, res) => {
  res.json({ data: await service.extractSkillsTest(req.body.text) });
});

export const parseCvTestHandler = asyncHandler(async (req, res) => {
  res.json({ data: await service.parseCvTest(req.body.text) });
});

export const parseJobTestHandler = asyncHandler(async (req, res) => {
  res.json({ data: await service.parseJobTest(req.body.text) });
});

export const leadScoringOverviewHandler = asyncHandler(async (req, res) => {
  res.json({ data: await service.getLeadScoringOverview() });
});

export const candidateScoringOverviewHandler = asyncHandler(async (req, res) => {
  res.json({ data: await service.getCandidateScoringOverview() });
});

export const opportunityScoringOverviewHandler = asyncHandler(async (req, res) => {
  res.json({ data: await service.getOpportunityScoringOverview() });
});

export const fraudOverviewHandler = asyncHandler(async (req, res) => {
  const result = await service.getFraudOverview(req.query);
  res.json({ data: result });
});

export const listAlertsHandler = asyncHandler(async (req, res) => {
  res.json({ data: await service.listAlerts(req.query) });
});

export const acknowledgeAlertHandler = asyncHandler(async (req, res) => {
  res.json({ data: await service.acknowledgeAlert(req.user.sub, req.params.id) });
});

export const listExperimentsHandler = asyncHandler(async (req, res) => {
  res.json({ data: await service.listExperiments(req.query) });
});

export const listAuditHandler = asyncHandler(async (req, res) => {
  res.json({ data: await service.listAudit(req.query) });
});
