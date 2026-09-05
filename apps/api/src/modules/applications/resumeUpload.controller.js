import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './resumeUpload.service.js';

export const requestUploadUrlHandler = asyncHandler(async (req, res) => {
  const result = await service.requestUploadUrl(req.user.sub, req.body);
  res.status(201).json({ data: result });
});

export const completeUploadHandler = asyncHandler(async (req, res) => {
  const result = await service.completeUpload(req.user.sub, req.body);
  res.json({ data: result });
});
