import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { validate } from '../../common/middleware/validate.js';
import { renameDeviceSchema, resolveAlertSchema, escalateAlertSchema, addAlertNoteSchema } from './security.validators.js';
import * as ctrl from './security.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/sessions', ctrl.listSessionsHandler);
router.get('/sessions/:id', ctrl.getSessionHandler);
router.post('/sessions/:id/revoke', ctrl.revokeSessionHandler);
router.post('/sessions/revoke-others', ctrl.revokeOthersHandler);

router.get('/devices', ctrl.listDevicesHandler);
router.patch('/devices/:id', validate(renameDeviceSchema), ctrl.renameDeviceHandler);
router.post('/devices/:id/trust', ctrl.trustDeviceHandler);
router.post('/devices/:id/untrust', ctrl.untrustDeviceHandler);
router.post('/devices/:id/revoke', ctrl.revokeDeviceHandler);

router.get('/login-history', ctrl.loginHistoryHandler);
router.get('/health', ctrl.securityHealthHandler);

router.get('/alerts', ctrl.listAlertsHandler);
router.get('/alerts/:id', ctrl.getAlertHandler);
router.post('/alerts/:id/resolve', validate(resolveAlertSchema), ctrl.resolveAlertHandler);
router.post('/alerts/:id/escalate', validate(escalateAlertSchema), ctrl.escalateAlertHandler);
router.post('/alerts/:id/dismiss', ctrl.dismissAlertHandler);
router.post('/alerts/:id/notes', validate(addAlertNoteSchema), ctrl.addAlertNoteHandler);
router.post('/alerts/:id/actions/force-sign-out', ctrl.forceSignOutHandler);
router.post('/alerts/:id/actions/require-password-reset', ctrl.requirePasswordResetHandler);
router.post('/alerts/:id/actions/require-mfa', ctrl.requireMfaHandler);

export default router;
