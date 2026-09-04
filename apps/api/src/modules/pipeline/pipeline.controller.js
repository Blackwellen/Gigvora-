import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './pipeline.service.js';

export const listStagesHandler = asyncHandler(async (req, res) => {
  const rows = await service.listStages(req.user.sub, { projectId: req.query.projectId, jobId: req.query.jobId });
  res.json({ data: rows, meta: { total: rows.length } });
});

export const listCandidatesHandler = asyncHandler(async (req, res) => {
  const rows = await service.listCandidates(req.user.sub, {
    projectId: req.query.projectId,
    jobId: req.query.jobId,
    stageId: req.query.stageId,
  });
  res.json({ data: rows, meta: { total: rows.length } });
});

export const createStageHandler = asyncHandler(async (req, res) => {
  const row = await service.createStage(req.user.sub, req.body);
  res.status(201).json({ data: row });
});

export const updateStageHandler = asyncHandler(async (req, res) => {
  const row = await service.updateStage(req.user.sub, req.params.id, req.body);
  res.json({ data: row });
});

export const addCandidateHandler = asyncHandler(async (req, res) => {
  const row = await service.addCandidate(req.user.sub, req.body);
  res.status(201).json({ data: row });
});

export const moveCandidateHandler = asyncHandler(async (req, res) => {
  const row = await service.moveCandidate(req.user.sub, req.params.id, req.body);
  res.json({ data: row });
});
