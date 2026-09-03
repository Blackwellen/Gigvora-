import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { validate } from '../../common/middleware/validate.js';
import { authOptionsSchema, registrationVerifySchema, authenticationVerifySchema, renameSchema } from './passkeys.validators.js';
import * as ctrl from './passkeys.controller.js';

const router = Router();

router.post('/registration/options', requireAuth, ctrl.registrationOptionsHandler);
router.post('/registration/verify', requireAuth, validate(registrationVerifySchema), ctrl.registrationVerifyHandler);

router.post('/authentication/options', validate(authOptionsSchema), ctrl.authenticationOptionsHandler);
router.post('/authentication/verify', validate(authenticationVerifySchema), ctrl.authenticationVerifyHandler);

router.get('/', requireAuth, ctrl.listHandler);
router.patch('/:id', requireAuth, validate(renameSchema), ctrl.renameHandler);
router.delete('/:id', requireAuth, ctrl.removeHandler);

export default router;
