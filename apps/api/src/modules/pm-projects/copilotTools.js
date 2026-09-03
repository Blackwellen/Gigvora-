// Domain 18 — governed Copilot tools (spec §41). This codebase's real
// LLM-backed Copilot orchestrator (modules/ai/copilotOrchestrator.service.js)
// does not yet have a function-calling/tool-registration loop to plug into —
// wiring these into it is a follow-up integration step, not something to
// fake here. What ships in this phase is the actual tool implementations
// themselves as governed, permission-checked, callable functions (reusing
// the exact same services/permission checks the normal UI uses — Copilot
// gets no special authorization path), exposed over REST so any caller
// (including a future tool-calling loop) can invoke them today.
import { Router } from 'express';
import { db } from '../../db/connection.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { loadProjectContext } from './shared.js';
import { assertPermission } from './permissions.js';
import { createTask } from './tasks.service.js';

async function assertAccess(projectId, userId) {
  const { membership } = await loadProjectContext(projectId, userId);
  assertPermission(Boolean(membership), 'You do not have access to this project');
  return membership;
}

export async function getProjectSummary(projectId, userId) {
  await assertAccess(projectId, userId);
  const project = await db('pm_projects').where({ id: projectId }).first();
  const [taskStats, milestoneStats, openIssues] = await Promise.all([
    db('pm_tasks').where({ project_id: projectId }).select(db.raw("count(*) as total, count(*) filter (where status='done') as done")).first(),
    db('pm_milestones').where({ project_id: projectId }).select(db.raw("count(*) as total, count(*) filter (where status in ('approved','completed')) as approved")).first(),
    db('pm_risks').where({ project_id: projectId, kind: 'issue', status: 'open' }).count('id as c').first(),
  ]);
  return {
    name: project.name,
    status: project.status,
    progressPct: project.progress_pct,
    tasksDone: Number(taskStats.done),
    tasksTotal: Number(taskStats.total),
    milestonesApproved: Number(milestoneStats.approved),
    milestonesTotal: Number(milestoneStats.total),
    openIssueCount: Number(openIssues?.c || 0),
    summary: `${project.name} is ${project.status} at ${project.progress_pct}% progress, with ${taskStats.done}/${taskStats.total} tasks done and ${openIssues?.c || 0} open issue(s).`,
  };
}

export async function listRisks(projectId, userId) {
  await assertAccess(projectId, userId);
  const rows = await db('pm_risks').where({ project_id: projectId, kind: 'risk' }).andWhereNot('status', 'resolved').orderBy('severity', 'desc');
  return rows.map((r) => ({ id: r.id, title: r.title, severity: r.severity, status: r.status, dueDate: r.due_date }));
}

export async function listBlockers(projectId, userId) {
  await assertAccess(projectId, userId);
  const [blockedTasks, overdueTasks] = await Promise.all([
    db('pm_tasks').where({ project_id: projectId, status: 'blocked' }).select('id', 'title', 'due_date'),
    db('pm_tasks').where({ project_id: projectId }).andWhereNot('status', 'done').andWhere('due_date', '<', db.raw('current_date')).select('id', 'title', 'due_date'),
  ]);
  return {
    blocked: blockedTasks.map((t) => ({ id: t.id, title: t.title, dueDate: t.due_date })),
    overdue: overdueTasks.map((t) => ({ id: t.id, title: t.title, dueDate: t.due_date })),
  };
}

export async function listMilestones(projectId, userId) {
  await assertAccess(projectId, userId);
  const rows = await db('pm_milestones').where({ project_id: projectId }).orderBy('target_date', 'asc');
  return rows.map((m) => ({ id: m.id, name: m.name, status: m.status, targetDate: m.target_date, completionPct: m.completion_pct }));
}

/** Consequential action — same createTask() + permission checks the Tasks UI
 * uses; Copilot has no elevated path (spec §41/42). */
export async function copilotCreateTask(projectId, userId, input) {
  return createTask(projectId, userId, input);
}

export const router = Router({ mergeParams: true });

router.get('/summary', asyncHandler(async (req, res) => res.json({ data: await getProjectSummary(req.params.id, req.user.sub) })));
router.get('/risks', asyncHandler(async (req, res) => res.json({ data: await listRisks(req.params.id, req.user.sub) })));
router.get('/blockers', asyncHandler(async (req, res) => res.json({ data: await listBlockers(req.params.id, req.user.sub) })));
router.get('/milestones', asyncHandler(async (req, res) => res.json({ data: await listMilestones(req.params.id, req.user.sub) })));
router.post('/tasks', asyncHandler(async (req, res) => {
  const data = await copilotCreateTask(req.params.id, req.user.sub, req.body);
  res.status(201).json({ data });
}));

export default router;
