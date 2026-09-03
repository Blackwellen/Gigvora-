import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './navigation.service.js';

function audienceCtx(req) {
  return { accountType: req.user.accountType, workspaceType: req.workspaceContext.type, userId: req.user.sub };
}

export const getTreeHandler = asyncHandler(async (req, res) => {
  const data = await service.getNavigationTree(audienceCtx(req));
  res.json({ data });
});

export const getMegaMenuHandler = asyncHandler(async (req, res) => {
  const data = await service.getMegaMenu(req.params.key, audienceCtx(req));
  if (!data) return res.status(404).json({ error: 'Navigation item not found' });
  res.json({ data });
});

export const getPreferencesHandler = asyncHandler(async (req, res) => {
  const data = await service.getPreferences(req.user.sub, req.workspaceContext.companyId);
  res.json({ data });
});

export const updatePreferencesHandler = asyncHandler(async (req, res) => {
  const data = await service.updatePreferences(req.user.sub, req.workspaceContext.companyId, req.body);
  res.json({ data });
});

export const pinHandler = asyncHandler(async (req, res) => {
  const data = await service.togglePin(req.user.sub, req.workspaceContext.companyId, req.body.itemKey, true);
  res.json({ data });
});

export const unpinHandler = asyncHandler(async (req, res) => {
  const data = await service.togglePin(req.user.sub, req.workspaceContext.companyId, req.body.itemKey, false);
  res.json({ data });
});
