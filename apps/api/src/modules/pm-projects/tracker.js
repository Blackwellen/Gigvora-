// Domain 18 §17 — Desktop activity tracker contract. No desktop client
// exists in this repository to pair with, so this is the real, callable
// server-side contract a future tracker app would integrate against — every
// consent/visibility/policy rule from the spec is enforced here even though
// nothing calls it yet from a native client. The web Time Tracking page
// (useTracker.ts / the tracker status card) is a real caller today, showing
// session status and letting a user start/pause/stop.
import { Router } from 'express';
import multer from 'multer';
import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { deleteObject, getSignedDownloadUrl } from '../../storage/s3.js';
import { secureProjectUpload } from './files.js';
import { loadProjectContext } from './shared.js';
import { canEditProject, assertPermission } from './permissions.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function serializeSession(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    timeEntryId: row.time_entry_id,
    userId: row.user_id,
    consentGiven: row.consent_given,
    screenshotsEnabled: row.screenshots_enabled,
    screenshotIntervalMinutes: row.screenshot_interval_minutes,
    status: row.status,
    createdAt: row.created_at,
  };
}

async function assertAccess(projectId, userId) {
  const { membership } = await loadProjectContext(projectId, userId);
  assertPermission(Boolean(membership), 'You do not have access to this project');
  return membership;
}

export const router = Router({ mergeParams: true });

/**
 * Starts a tracked session tied to an already-running timer entry
 * (POST .../time-entries/timer/start). Requires explicit, affirmative
 * consent — `consentGiven` must be true in the request body, mirroring the
 * spec's "explicit user consent" requirement; a tracker session is never
 * created silently alongside a plain timer start.
 */
router.post('/sessions', asyncHandler(async (req, res) => {
  await assertAccess(req.params.id, req.user.sub);
  const { timeEntryId, consentGiven, screenshotsEnabled = false, screenshotIntervalMinutes } = req.body;

  if (consentGiven !== true) {
    throw new AppError('Activity tracking requires explicit consent before it can start', 422, { code: 'CONSENT_REQUIRED' });
  }
  const entry = await db('pm_time_entries').where({ id: timeEntryId, project_id: req.params.id, user_id: req.user.sub, source: 'timer' }).first();
  if (!entry) throw new AppError('A running timer entry is required to start a tracked session', 404);

  if (screenshotsEnabled && ![5, 10, 15, 20].includes(Number(screenshotIntervalMinutes))) {
    throw new AppError('screenshotIntervalMinutes must be one of 5, 10, 15, 20', 422);
  }

  const [session] = await db('pm_time_sessions')
    .insert({
      project_id: req.params.id,
      time_entry_id: timeEntryId,
      user_id: req.user.sub,
      consent_given: true,
      screenshots_enabled: Boolean(screenshotsEnabled),
      screenshot_interval_minutes: screenshotsEnabled ? Number(screenshotIntervalMinutes) : null,
    })
    .returning('*');

  res.status(201).json({ data: serializeSession(session) });
}));

router.get('/sessions/active', asyncHandler(async (req, res) => {
  await assertAccess(req.params.id, req.user.sub);
  const session = await db('pm_time_sessions').where({ project_id: req.params.id, user_id: req.user.sub, status: 'active' }).orderBy('created_at', 'desc').first();
  res.json({ data: session ? serializeSession(session) : null });
}));

router.post('/sessions/:sessionId/pause', asyncHandler(async (req, res) => {
  await assertAccess(req.params.id, req.user.sub);
  const [updated] = await db('pm_time_sessions')
    .where({ id: req.params.sessionId, project_id: req.params.id, user_id: req.user.sub, status: 'active' })
    .update({ status: 'paused', paused_at: db.fn.now() })
    .returning('*');
  if (!updated) throw new AppError('Active session not found', 404);
  res.json({ data: serializeSession(updated) });
}));

router.post('/sessions/:sessionId/resume', asyncHandler(async (req, res) => {
  await assertAccess(req.params.id, req.user.sub);
  const [updated] = await db('pm_time_sessions')
    .where({ id: req.params.sessionId, project_id: req.params.id, user_id: req.user.sub, status: 'paused' })
    .update({ status: 'active', paused_at: null })
    .returning('*');
  if (!updated) throw new AppError('Paused session not found', 404);
  res.json({ data: serializeSession(updated) });
}));

router.post('/sessions/:sessionId/stop', asyncHandler(async (req, res) => {
  await assertAccess(req.params.id, req.user.sub);
  const [updated] = await db('pm_time_sessions')
    .where({ id: req.params.sessionId, project_id: req.params.id, user_id: req.user.sub })
    .whereIn('status', ['active', 'paused'])
    .update({ status: 'stopped', stopped_at: db.fn.now() })
    .returning('*');
  if (!updated) throw new AppError('Session not found', 404);
  res.json({ data: serializeSession(updated) });
}));

/**
 * Client sends only a derived 0-100 activity score and an idle flag — never
 * raw keyboard/mouse events or window titles/keystroke contents (spec §17).
 * Rejected if the session isn't active or consent was somehow revoked.
 */
router.post('/sessions/:sessionId/heartbeat', asyncHandler(async (req, res) => {
  await assertAccess(req.params.id, req.user.sub);
  const session = await db('pm_time_sessions').where({ id: req.params.sessionId, project_id: req.params.id, user_id: req.user.sub }).first();
  if (!session) throw new AppError('Session not found', 404);
  if (session.status !== 'active' || !session.consent_given) throw new AppError('Session is not actively tracking', 422);

  const { activityScore, idle = false, appCategory } = req.body;
  if (!Number.isFinite(Number(activityScore)) || activityScore < 0 || activityScore > 100) {
    throw new AppError('activityScore must be between 0 and 100', 422);
  }

  await db('pm_activity_samples').insert({ session_id: session.id, activity_score: Math.round(activityScore), idle: Boolean(idle), app_category: appCategory || null });
  res.status(201).json({ data: { recorded: true } });
}));

router.get('/sessions/:sessionId/activity', asyncHandler(async (req, res) => {
  const membership = await assertAccess(req.params.id, req.user.sub);
  const session = await db('pm_time_sessions').where({ id: req.params.sessionId, project_id: req.params.id }).first();
  if (!session) throw new AppError('Session not found', 404);
  assertPermission(session.user_id === req.user.sub || canEditProject(membership), 'You do not have permission to view this activity');

  const samples = await db('pm_activity_samples').where({ session_id: session.id }).orderBy('sampled_at', 'asc');
  res.json({
    data: samples.map((s) => ({ activityScore: s.activity_score, idle: s.idle, appCategory: s.app_category, sampledAt: s.sampled_at })),
  });
}));

router.post('/sessions/:sessionId/screenshots', upload.single('file'), asyncHandler(async (req, res) => {
  await assertAccess(req.params.id, req.user.sub);
  const session = await db('pm_time_sessions').where({ id: req.params.sessionId, project_id: req.params.id, user_id: req.user.sub }).first();
  if (!session) throw new AppError('Session not found', 404);
  if (!session.screenshots_enabled) throw new AppError('Screenshot capture is not enabled for this session', 422, { code: 'SCREENSHOTS_NOT_ENABLED' });

  const uploaded = await secureProjectUpload(req.file, { projectId: req.params.id, userId: req.user.sub });
  const [row] = await db('pm_screenshot_assets').insert({ session_id: session.id, object_key: uploaded.key }).returning('*');
  res.status(201).json({ data: { id: row.id, capturedAt: row.captured_at } });
}));

router.get('/sessions/:sessionId/screenshots', asyncHandler(async (req, res) => {
  const membership = await assertAccess(req.params.id, req.user.sub);
  const session = await db('pm_time_sessions').where({ id: req.params.sessionId, project_id: req.params.id }).first();
  if (!session) throw new AppError('Session not found', 404);
  assertPermission(session.user_id === req.user.sub || canEditProject(membership), 'You do not have permission to view these screenshots');

  const rows = await db('pm_screenshot_assets').where({ session_id: session.id }).whereNull('deleted_at').orderBy('captured_at', 'desc');
  res.json({ data: rows.map((r) => ({ id: r.id, capturedAt: r.captured_at })) });
}));

router.get('/screenshots/:screenshotId/view-url', asyncHandler(async (req, res) => {
  const membership = await assertAccess(req.params.id, req.user.sub);
  const screenshot = await db('pm_screenshot_assets as s')
    .join('pm_time_sessions as sess', 'sess.id', 's.session_id')
    .where({ 's.id': req.params.screenshotId, 'sess.project_id': req.params.id })
    .whereNull('s.deleted_at')
    .select('s.*', 'sess.user_id as session_user_id')
    .first();
  if (!screenshot) throw new AppError('Screenshot not found', 404);
  assertPermission(screenshot.session_user_id === req.user.sub || canEditProject(membership), 'You do not have permission to view this screenshot');

  const url = await getSignedDownloadUrl(screenshot.object_key, 120);
  res.json({ data: { url, expiresInSeconds: 120 } });
}));

/** Deletion subject to policy/audit — a manager (or the tracked user themself) may delete a
 * specific screenshot; the row is soft-deleted (deleted_at/deleted_by) rather than hard-removed
 * so the audit trail survives even though the underlying object is unlinked. */
router.delete('/screenshots/:screenshotId', asyncHandler(async (req, res) => {
  const membership = await assertAccess(req.params.id, req.user.sub);
  const screenshot = await db('pm_screenshot_assets as s')
    .join('pm_time_sessions as sess', 'sess.id', 's.session_id')
    .where({ 's.id': req.params.screenshotId, 'sess.project_id': req.params.id })
    .select('s.*', 'sess.user_id as session_user_id')
    .first();
  if (!screenshot) throw new AppError('Screenshot not found', 404);
  assertPermission(screenshot.session_user_id === req.user.sub || canEditProject(membership), 'You do not have permission to delete this screenshot');

  await db('pm_screenshot_assets').where({ id: screenshot.id }).update({ deleted_at: db.fn.now(), deleted_by: req.user.sub });
  await deleteObject(screenshot.object_key).catch(() => {});
  res.status(204).end();
}));

export default router;
