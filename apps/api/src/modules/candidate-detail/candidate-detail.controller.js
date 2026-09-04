import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './candidate-detail.service.js';

export const getHandler = asyncHandler(async (req, res) => {
  const record = await service.getCandidateDetail(req.user.sub, req.params.candidateId, { skills: req.query.skills });
  res.json({ data: record });
});
