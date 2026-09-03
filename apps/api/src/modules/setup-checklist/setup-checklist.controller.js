import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './setup-checklist.service.js';

export const getChecklistHandler = asyncHandler(async (req, res) => {
  const owner = service.resolveOwner(req);
  const items = await service.getChecklist(owner, req.user.sub);
  const completed = items.filter((i) => i.status === 'completed').length;
  const inProgress = items.filter((i) => i.status === 'in_progress').length;
  const notStarted = items.filter((i) => i.status === 'not_started').length;
  res.json({
    data: {
      items,
      summary: { total: items.length, completed, inProgress, notStarted },
    },
  });
});

export const dismissItemHandler = asyncHandler(async (req, res) => {
  const owner = service.resolveOwner(req);
  const record = await service.dismissItem(owner, req.params.itemKey);
  res.json({ data: record });
});
