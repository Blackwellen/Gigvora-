import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { userRateLimit } from '../../common/middleware/userRateLimit.js';
import {
  createDraftReplyActionHandler,
  listActionsHandler,
  getActionHandler,
  decideActionHandler,
  createTaskHandler,
  listTasksHandler,
  getTaskHandler,
  cancelTaskHandler,
  listMemoriesHandler,
  createMemoryHandler,
  deleteMemoryHandler,
  resetMemoriesHandler,
  exportMemoriesHandler,
  getPersonalisationHandler,
  updatePersonalisationHandler,
  listAvailableModelsHandler,
  getModelPreferencesHandler,
  updateModelPreferencesHandler,
  getUsageOverviewHandler,
  listAuditEventsHandler,
  getAuditEventHandler,
  getComplianceSummaryHandler,
  listPromptsHandler,
  createPromptHandler,
  runPromptHandler,
} from './ai.controller.js';

const actionsRouter = Router();
actionsRouter.use(requireAuth);
actionsRouter.post('/draft-reply', userRateLimit({ keyPrefix: 'ai-draft-reply', windowSeconds: 60, max: 20 }), createDraftReplyActionHandler);
actionsRouter.get('/', listActionsHandler);
actionsRouter.get('/:id', getActionHandler);
actionsRouter.post('/:id/decide', decideActionHandler);

const tasksRouter = Router();
tasksRouter.use(requireAuth);
tasksRouter.post('/', userRateLimit({ keyPrefix: 'ai-task-create', windowSeconds: 60, max: 10 }), createTaskHandler);
tasksRouter.get('/', listTasksHandler);
tasksRouter.get('/:id', getTaskHandler);
tasksRouter.post('/:id/cancel', cancelTaskHandler);

const memoryRouter = Router();
memoryRouter.use(requireAuth);
memoryRouter.get('/', listMemoriesHandler);
memoryRouter.post('/', createMemoryHandler);
memoryRouter.delete('/:id', deleteMemoryHandler);
memoryRouter.post('/reset', resetMemoriesHandler);
memoryRouter.get('/export', exportMemoriesHandler);

const personalisationRouter = Router();
personalisationRouter.use(requireAuth);
personalisationRouter.get('/', getPersonalisationHandler);
personalisationRouter.patch('/', updatePersonalisationHandler);

const modelPreferencesRouter = Router();
modelPreferencesRouter.use(requireAuth);
modelPreferencesRouter.get('/available-models', listAvailableModelsHandler);
modelPreferencesRouter.get('/', getModelPreferencesHandler);
modelPreferencesRouter.patch('/', updateModelPreferencesHandler);

const usageRouter = Router();
usageRouter.use(requireAuth);
usageRouter.get('/', getUsageOverviewHandler);

const auditRouter = Router();
auditRouter.use(requireAuth);
auditRouter.get('/compliance-summary', getComplianceSummaryHandler);
auditRouter.get('/', listAuditEventsHandler);
auditRouter.get('/:id', getAuditEventHandler);

const promptsRouter = Router();
promptsRouter.use(requireAuth);
promptsRouter.get('/', listPromptsHandler);
promptsRouter.post('/', createPromptHandler);
promptsRouter.post('/:id/run', runPromptHandler);

export { actionsRouter, tasksRouter, memoryRouter, personalisationRouter, modelPreferencesRouter, usageRouter, auditRouter, promptsRouter };
