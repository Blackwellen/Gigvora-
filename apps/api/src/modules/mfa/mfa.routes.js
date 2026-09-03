import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { validate } from '../../common/middleware/validate.js';
import { beginTotpSchema, verifyTotpSchema, regenerateSchema, removeMethodSchema } from './mfa.validators.js';
import * as ctrl from './mfa.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/', ctrl.listHandler);
router.post('/totp/begin', validate(beginTotpSchema), ctrl.beginTotpHandler);
router.post('/totp/verify', validate(verifyTotpSchema), ctrl.verifyTotpHandler);
router.post('/recovery-codes/regenerate', validate(regenerateSchema), ctrl.regenerateRecoveryCodesHandler);
router.delete('/:methodId', validate(removeMethodSchema), ctrl.removeMethodHandler);

export default router;
