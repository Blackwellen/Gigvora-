import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { resolveWorkspaceContext } from '../../common/middleware/workspaceContext.js';
import * as c from './pmProjects.controller.js';
import filesRouter from './files.js';
import discussionsRouter from './discussions.js';
import chatRouter from './chat.js';
import timeRouter from './time.js';
import trackerRouter from './tracker.js';
import timesheetsRouter from './timesheets.js';
import budgetRouter from './budget.js';
import approvalsRouter from './approvals.js';
import changeRequestsRouter from './changeRequests.js';
import bidsRouter from './bids.js';
import paySplitsRouter from './paySplits.js';
import risksRouter from './risks.js';
import dependenciesRouter from './dependencies.js';
import settingsRouter from './settings.js';
import completionRouter from './completion.js';
import paymentsRouter from './payments.js';
import resourcePlanningRouter from './resourcePlanning.js';
import analyticsRouter from './analytics.js';
import copilotToolsRouter from './copilotTools.js';

const router = Router();
router.use(requireAuth, resolveWorkspaceContext);

router.get('/', c.listProjectsHandler);
router.post('/', c.createProjectHandler);
// Marketplace discovery routes must be registered before the '/:id' catch-all
// below — otherwise Express would treat "marketplace" as an :id value.
router.get('/marketplace', c.listMarketplaceProjectsHandler);
router.get('/:id', c.getProjectHandler);
router.patch('/:id', c.updateProjectHandler);
router.delete('/:id', c.deleteProjectHandler);
router.get('/:id/brief', c.getProjectBriefHandler);

router.get('/:id/members', c.listMembersHandler);
router.post('/:id/members', c.addMemberHandler);
router.patch('/:id/members/:memberId', c.updateMemberRoleHandler);
router.delete('/:id/members/:memberId', c.removeMemberHandler);

router.get('/:id/tasks', c.listTasksHandler);
router.post('/:id/tasks', c.createTaskHandler);
router.patch('/:id/tasks/:taskId', c.updateTaskHandler);
router.delete('/:id/tasks/:taskId', c.deleteTaskHandler);

router.get('/:id/board', c.getBoardHandler);
router.patch('/:id/board/:taskId/move', c.moveTaskHandler);

router.get('/:id/milestones', c.listMilestonesHandler);
router.post('/:id/milestones', c.createMilestoneHandler);
router.patch('/:id/milestones/:milestoneId', c.updateMilestoneHandler);
router.delete('/:id/milestones/:milestoneId', c.deleteMilestoneHandler);

router.get('/:id/deliverables', c.listDeliverablesHandler);
router.post('/:id/deliverables', c.createDeliverableHandler);
router.patch('/:id/deliverables/:deliverableId', c.updateDeliverableHandler);
router.delete('/:id/deliverables/:deliverableId', c.deleteDeliverableHandler);

router.use('/:id/files', filesRouter);
router.use('/:id/discussions', discussionsRouter);
router.use('/:id/chat', chatRouter);
router.use('/:id/time-entries', timeRouter);
router.use('/:id/tracker', trackerRouter);
router.use('/:id/timesheets', timesheetsRouter);
router.use('/:id/budget', budgetRouter);
router.use('/:id/approvals', approvalsRouter);
router.use('/:id/change-requests', changeRequestsRouter);
router.use('/:id/bids', bidsRouter);
router.use('/:id/pay-splits', paySplitsRouter);
router.use('/:id/risks', risksRouter);
router.use('/:id/dependencies', dependenciesRouter);
router.use('/:id/settings', settingsRouter);
router.use('/:id/completion', completionRouter);
router.use('/:id/payment-milestones', paymentsRouter);
router.use('/:id/resource-planning', resourcePlanningRouter);
router.use('/:id/analytics', analyticsRouter);
router.use('/:id/copilot-tools', copilotToolsRouter);

export default router;
