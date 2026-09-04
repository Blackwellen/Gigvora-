import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { getAutomationStatus, listSlaBreaches, getAtsSync } from './recruiter-pro-projects.service.js';

export const getAutomationStatusHandler = asyncHandler(async (req, res) => {
  const data = await getAutomationStatus(req.user.sub, req.params.projectId);
  res.json({ data });
});

export const listSlaBreachesHandler = asyncHandler(async (req, res) => {
  const data = await listSlaBreaches(req.user.sub);
  res.json({ data });
});

export const getAtsSyncHandler = asyncHandler(async (req, res) => {
  const data = await getAtsSync(req.user.sub, req.params.projectId);
  res.json({ data });
});
