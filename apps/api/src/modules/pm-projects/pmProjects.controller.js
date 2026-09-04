import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as projects from './projects.service.js';
import * as members from './members.service.js';
import * as tasks from './tasks.service.js';
import * as milestones from './milestones.service.js';
import * as deliverables from './deliverables.service.js';

const h = (fn) => asyncHandler(async (req, res) => res.json({ data: await fn(req, res) }));

// --- Projects ---------------------------------------------------------
// listProjects already returns { data, pagination } — forwarded as-is
// rather than through the `h` helper, which would double-wrap it as
// { data: { data, pagination } } and break every client reading
// response.data.data as the array.
export const listProjectsHandler = asyncHandler(async (req, res) => {
  const result = await projects.listProjects(req.user.sub, {
    status: req.query.status,
    search: req.query.search,
    category: req.query.category,
    countryCode: req.query.countryCode,
    sort: req.query.sort,
    page: req.query.page ? Number(req.query.page) : undefined,
    pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
  });
  res.json(result);
});
export const getProjectHandler = h((req) => projects.getProject(req.params.id, req.user.sub));

// Marketplace discovery (no membership required) — see projects.service.js
// listMarketplaceProjects/getProjectBrief for why these are separate from
// listProjects/getProject rather than a mode flag on them.
export const listMarketplaceProjectsHandler = asyncHandler(async (req, res) => {
  const result = await projects.listMarketplaceProjects({
    category: req.query.category,
    countryCode: req.query.countryCode,
    search: req.query.search,
    page: req.query.page ? Number(req.query.page) : undefined,
    pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
  });
  res.json(result);
});
export const getProjectBriefHandler = h((req) => projects.getProjectBrief(req.params.id, req.user.sub));
export const createProjectHandler = asyncHandler(async (req, res) => {
  const data = await projects.createProject(req.user.sub, req.body);
  res.status(201).json({ data });
});
export const updateProjectHandler = h((req) => projects.updateProject(req.params.id, req.user.sub, req.body));
export const deleteProjectHandler = asyncHandler(async (req, res) => {
  await projects.deleteProject(req.params.id, req.user.sub);
  res.status(204).end();
});

// --- Members ------------------------------------------------------------
export const listMembersHandler = h((req) => members.listMembers(req.params.id, req.user.sub));
export const addMemberHandler = asyncHandler(async (req, res) => {
  const data = await members.addMember(req.params.id, req.user.sub, req.body);
  res.status(201).json({ data });
});
export const updateMemberRoleHandler = h((req) => members.updateMemberRole(req.params.id, req.user.sub, req.params.memberId, req.body.role));
export const removeMemberHandler = asyncHandler(async (req, res) => {
  await members.removeMember(req.params.id, req.user.sub, req.params.memberId);
  res.status(204).end();
});

// --- Tasks ----------------------------------------------------------------
export const listTasksHandler = h((req) =>
  tasks.listTasks(req.params.id, req.user.sub, {
    status: req.query.status,
    assigneeId: req.query.assigneeId,
    priority: req.query.priority,
    search: req.query.search,
  })
);
export const getBoardHandler = h((req) => tasks.getBoard(req.params.id, req.user.sub));
export const createTaskHandler = asyncHandler(async (req, res) => {
  const data = await tasks.createTask(req.params.id, req.user.sub, req.body);
  res.status(201).json({ data });
});
export const updateTaskHandler = h((req) => tasks.updateTask(req.params.id, req.user.sub, req.params.taskId, req.body));
export const deleteTaskHandler = asyncHandler(async (req, res) => {
  await tasks.deleteTask(req.params.id, req.user.sub, req.params.taskId);
  res.status(204).end();
});
export const moveTaskHandler = h((req) => tasks.moveTask(req.params.id, req.user.sub, req.params.taskId, req.body));

// --- Milestones -------------------------------------------------------
export const listMilestonesHandler = h((req) => milestones.listMilestones(req.params.id, req.user.sub));
export const createMilestoneHandler = asyncHandler(async (req, res) => {
  const data = await milestones.createMilestone(req.params.id, req.user.sub, req.body);
  res.status(201).json({ data });
});
export const updateMilestoneHandler = h((req) => milestones.updateMilestone(req.params.id, req.user.sub, req.params.milestoneId, req.body));
export const deleteMilestoneHandler = asyncHandler(async (req, res) => {
  await milestones.deleteMilestone(req.params.id, req.user.sub, req.params.milestoneId);
  res.status(204).end();
});

// --- Deliverables -----------------------------------------------------
export const listDeliverablesHandler = h((req) => deliverables.listDeliverables(req.params.id, req.user.sub));
export const createDeliverableHandler = asyncHandler(async (req, res) => {
  const data = await deliverables.createDeliverable(req.params.id, req.user.sub, req.body);
  res.status(201).json({ data });
});
export const updateDeliverableHandler = h((req) => deliverables.updateDeliverable(req.params.id, req.user.sub, req.params.deliverableId, req.body));
export const deleteDeliverableHandler = asyncHandler(async (req, res) => {
  await deliverables.deleteDeliverable(req.params.id, req.user.sub, req.params.deliverableId);
  res.status(204).end();
});
