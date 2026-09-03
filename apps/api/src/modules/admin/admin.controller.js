import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { getAdminContext } from './admin.service.js';

export const contextHandler = asyncHandler(async (req, res) => {
  const data = getAdminContext(req.user.role);
  res.status(200).json({ data });
});
