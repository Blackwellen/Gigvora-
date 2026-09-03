import { Router } from 'express';
import { validate } from '../../common/middleware/validate.js';
import { authRateLimit } from '../../common/middleware/authRateLimit.js';
import { startSchema, challengeSchema, verifySchema, completeSchema } from './account-recovery.validators.js';
import * as ctrl from './account-recovery.controller.js';

const router = Router();
const startLimit = authRateLimit({ keyPrefix: 'account-recovery-start', windowSeconds: 3600, max: 6, identityField: 'email' });

router.post('/', startLimit, validate(startSchema), ctrl.startHandler);
router.get('/:id', ctrl.getHandler);
router.post('/:id/challenge', validate(challengeSchema), ctrl.challengeHandler);
router.post('/:id/verify', validate(verifySchema), ctrl.verifyHandler);
router.post('/:id/complete', validate(completeSchema), ctrl.completeHandler);

export default router;
