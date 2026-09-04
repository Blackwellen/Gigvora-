import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { requireRecruiterSeat } from '../../common/middleware/recruiterSeat.js';
import {
  listSavedSearchesHandler,
  createSavedSearchHandler,
  removeSavedSearchHandler,
  listHandler,
  createHandler,
  updateHandler,
  removeHandler,
  runNowHandler,
} from './recruiter-search-alerts.controller.js';

const router = Router();
router.use(requireAuth, requireRecruiterSeat);

router.get('/saved-searches', listSavedSearchesHandler);
router.post('/saved-searches', createSavedSearchHandler);
router.delete('/saved-searches/:id', removeSavedSearchHandler);

router.get('/', listHandler);
router.post('/', createHandler);
router.patch('/:id', updateHandler);
router.delete('/:id', removeHandler);
router.post('/:id/run', runNowHandler);

export default router;
