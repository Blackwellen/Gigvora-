import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { listQuestionsHandler, addQuestionHandler, listQueueHandler, reviewApplicationHandler } from './screening.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/jobs/:jobId/questions', listQuestionsHandler);
router.post('/jobs/:jobId/questions', addQuestionHandler);
router.get('/jobs/:jobId/queue', listQueueHandler);
router.post('/applications/:applicationId/review', reviewApplicationHandler);

export default router;
