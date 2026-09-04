import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { requireRecruiterProSeat } from '../../common/middleware/requireRecruiterProSeat.js';
import {
  listStagesHandler,
  listCandidatesHandler,
  createStageHandler,
  updateStageHandler,
  addCandidateHandler,
  moveCandidateHandler,
} from './pipeline.controller.js';

const router = Router();
router.use(requireAuth, requireRecruiterProSeat);

router.get('/stages', listStagesHandler);
router.post('/stages', createStageHandler);
router.patch('/stages/:id', updateStageHandler);
router.get('/candidates', listCandidatesHandler);
router.post('/candidates', addCandidateHandler);
router.patch('/candidates/:id/move', moveCandidateHandler);

export default router;
