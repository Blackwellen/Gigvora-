import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { requireRecruiterProSeat } from '../../common/middleware/requireRecruiterProSeat.js';
import {
  listHandler,
  getHandler,
  createHandler,
  updateHandler,
  removeHandler,
  listAudienceHandler,
  addAudienceMemberHandler,
  removeAudienceMemberHandler,
  listVariantsHandler,
  addVariantHandler,
  removeVariantHandler,
  sendHandler,
} from './bulk-outreach.controller.js';

const router = Router();
router.use(requireAuth, requireRecruiterProSeat);

router.get('/', listHandler);
router.post('/', createHandler);
router.get('/:id', getHandler);
router.patch('/:id', updateHandler);
router.delete('/:id', removeHandler);

router.get('/:id/audience', listAudienceHandler);
router.post('/:id/audience', addAudienceMemberHandler);
router.delete('/:id/audience/:audienceId', removeAudienceMemberHandler);

router.get('/:id/variants', listVariantsHandler);
router.post('/:id/variants', addVariantHandler);
router.delete('/:id/variants/:variantId', removeVariantHandler);

router.post('/:id/send', sendHandler);

export default router;
