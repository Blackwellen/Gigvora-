import { Router } from 'express';
import { validate } from '../../common/middleware/validate.js';
import { requireAuth } from '../../common/middleware/auth.js';
import { authRateLimit } from '../../common/middleware/authRateLimit.js';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from './auth.validators.js';
import {
  registerHandler,
  loginHandler,
  refreshHandler,
  meHandler,
  logoutHandler,
  logoutAllHandler,
  resendVerificationHandler,
  verifyEmailHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  changePasswordHandler,
  completeMfaSignInHandler,
} from './auth.controller.js';
import { z } from 'zod';

const mfaSignInSchema = z.object({
  pendingToken: z.string().min(1),
  code: z.string().min(6).max(12),
  useRecoveryCode: z.boolean().optional(),
});

const router = Router();

const signupLimit = authRateLimit({ keyPrefix: 'signup', windowSeconds: 3600, max: 8 });
const signinLimit = authRateLimit({ keyPrefix: 'signin', windowSeconds: 900, max: 15, identityField: 'email' });
const forgotLimit = authRateLimit({ keyPrefix: 'forgot', windowSeconds: 900, max: 5, identityField: 'email' });
const resendLimit = authRateLimit({ keyPrefix: 'resend', windowSeconds: 900, max: 5 });

router.post('/register', signupLimit, validate(registerSchema), registerHandler);
router.post('/login', signinLimit, validate(loginSchema), loginHandler);
router.post('/refresh', validate(refreshSchema), refreshHandler);
router.post('/mfa/verify-signin', signinLimit, validate(mfaSignInSchema), completeMfaSignInHandler);
router.get('/me', requireAuth, meHandler);
router.post('/logout', requireAuth, logoutHandler);
router.post('/logout-all', requireAuth, logoutAllHandler);

router.post('/email/resend', requireAuth, resendLimit, resendVerificationHandler);
router.post('/email/verify', validate(verifyEmailSchema), verifyEmailHandler);

router.post('/password/forgot', forgotLimit, validate(forgotPasswordSchema), forgotPasswordHandler);
router.post('/password/reset', validate(resetPasswordSchema), resetPasswordHandler);
router.post('/password/change', requireAuth, validate(changePasswordSchema), changePasswordHandler);

export default router;
