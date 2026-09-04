import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { requireRecruiterProSeat } from '../../common/middleware/requireRecruiterProSeat.js';
import {
  runQueryHandler,
  listSavedQueriesHandler,
  createSavedQueryHandler,
  deleteSavedQueryHandler,
} from './advanced-candidate-search.controller.js';

const router = Router();
router.use(requireAuth, requireRecruiterProSeat);

router.post('/query', runQueryHandler);
router.get('/saved-queries', listSavedQueriesHandler);
router.post('/saved-queries', createSavedQueryHandler);
router.delete('/saved-queries/:id', deleteSavedQueryHandler);

export default router;
