import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { validate } from '../../common/middleware/validate.js';
import { saveDraftSchema } from './account-intent.validators.js';
import { getDraftHandler, saveDraftHandler, completeHandler } from './account-intent.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/draft', getDraftHandler);
router.post('/draft', validate(saveDraftSchema), saveDraftHandler);
router.post('/complete', completeHandler);

export default router;
