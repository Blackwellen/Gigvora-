import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './screening.service.js';

export const listQuestionsHandler = asyncHandler(async (req, res) => {
  const records = await service.listQuestions(req.params.jobId);
  res.json({ data: records });
});

export const addQuestionHandler = asyncHandler(async (req, res) => {
  const record = await service.addQuestion(req.params.jobId, req.body);
  res.status(201).json({ data: record });
});

export const listQueueHandler = asyncHandler(async (req, res) => {
  const { limit, offset } = req.query;
  const result = await service.listQueue(req.params.jobId, { limit, offset });
  res.json({ data: result.items, meta: { total: result.total } });
});

export const reviewApplicationHandler = asyncHandler(async (req, res) => {
  const result = await service.reviewApplication(req.params.applicationId, req.user.sub, req.body);
  res.status(201).json({ data: result });
});
