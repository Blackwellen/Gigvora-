import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as securityService from './security.service.js';
import * as alertsService from './alerts.service.js';

function ctx(req) {
  return { userId: req.user.sub, isAdmin: req.user.role === 'admin', actorId: req.user.sub };
}

export const listSessionsHandler = asyncHandler(async (req, res) => {
  const result = await securityService.listSessions({ ...ctx(req), ...req.query, page: Number(req.query.page) || 1, pageSize: Number(req.query.pageSize) || 20 });
  res.json(result);
});

export const getSessionHandler = asyncHandler(async (req, res) => {
  const session = await securityService.getSession({ ...ctx(req), sessionId: req.params.id });
  res.json(session);
});

export const revokeSessionHandler = asyncHandler(async (req, res) => {
  const result = await securityService.revokeSessionById({ ...ctx(req), sessionId: req.params.id });
  res.json(result);
});

export const revokeOthersHandler = asyncHandler(async (req, res) => {
  const result = await securityService.revokeOtherSessions({ userId: req.user.sub, currentSessionId: req.user.sid });
  res.json({ revokedCount: result.length });
});

export const listDevicesHandler = asyncHandler(async (req, res) => {
  const result = await securityService.listDevices({ ...ctx(req), ...req.query, page: Number(req.query.page) || 1, pageSize: Number(req.query.pageSize) || 20 });
  res.json(result);
});

export const renameDeviceHandler = asyncHandler(async (req, res) => {
  const device = await securityService.renameDevice({ ...ctx(req), deviceId: req.params.id, displayName: req.body.displayName });
  res.json(device);
});

export const trustDeviceHandler = asyncHandler(async (req, res) => {
  const device = await securityService.trustDevice({ ...ctx(req), deviceId: req.params.id });
  res.json(device);
});

export const untrustDeviceHandler = asyncHandler(async (req, res) => {
  const device = await securityService.untrustDevice({ ...ctx(req), deviceId: req.params.id });
  res.json(device);
});

export const revokeDeviceHandler = asyncHandler(async (req, res) => {
  const result = await securityService.revokeDevice({ ...ctx(req), deviceId: req.params.id });
  res.json(result);
});

export const loginHistoryHandler = asyncHandler(async (req, res) => {
  const result = await securityService.listLoginHistory({ ...ctx(req), page: Number(req.query.page) || 1, pageSize: Number(req.query.pageSize) || 20 });
  res.json(result);
});

export const securityHealthHandler = asyncHandler(async (req, res) => {
  const result = await securityService.getSecurityHealth({ userId: req.user.sub });
  res.json(result);
});

export const listAlertsHandler = asyncHandler(async (req, res) => {
  const result = await alertsService.listAlerts({ ...ctx(req), ...req.query, page: Number(req.query.page) || 1, pageSize: Number(req.query.pageSize) || 20 });
  res.json(result);
});

export const getAlertHandler = asyncHandler(async (req, res) => {
  const result = await alertsService.getAlert({ ...ctx(req), alertId: req.params.id });
  res.json(result);
});

export const resolveAlertHandler = asyncHandler(async (req, res) => {
  const result = await alertsService.resolveAlert({ ...ctx(req), alertId: req.params.id, reason: req.body?.reason });
  res.json(result);
});

export const escalateAlertHandler = asyncHandler(async (req, res) => {
  const result = await alertsService.escalateAlert({ ...ctx(req), alertId: req.params.id, note: req.body?.note });
  res.json(result);
});

export const dismissAlertHandler = asyncHandler(async (req, res) => {
  const result = await alertsService.dismissAlert({ ...ctx(req), alertId: req.params.id });
  res.json(result);
});

export const addAlertNoteHandler = asyncHandler(async (req, res) => {
  const result = await alertsService.addAlertNote({ ...ctx(req), alertId: req.params.id, body: req.body.body });
  res.status(201).json(result);
});

export const forceSignOutHandler = asyncHandler(async (req, res) => {
  const result = await alertsService.forceSignOut({ ...ctx(req), alertId: req.params.id });
  res.json(result);
});

export const requirePasswordResetHandler = asyncHandler(async (req, res) => {
  const result = await alertsService.requirePasswordReset({ ...ctx(req), alertId: req.params.id });
  res.json(result);
});

export const requireMfaHandler = asyncHandler(async (req, res) => {
  const result = await alertsService.requireMfa({ ...ctx(req), alertId: req.params.id });
  res.json(result);
});
