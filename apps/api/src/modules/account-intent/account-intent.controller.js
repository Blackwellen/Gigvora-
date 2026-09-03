import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './account-intent.service.js';

export const getDraftHandler = asyncHandler(async (req, res) => {
  const draft = await service.getDraft({ userId: req.user.sub });
  res.json({ draft });
});

export const saveDraftHandler = asyncHandler(async (req, res) => {
  const draft = await service.saveDraft({ userId: req.user.sub, ...req.body });
  res.json({ draft });
});

export const completeHandler = asyncHandler(async (req, res) => {
  const draft = await service.completeIntent({ userId: req.user.sub });
  res.json({ draft });
});
