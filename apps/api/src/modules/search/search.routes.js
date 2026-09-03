import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import {
  searchAllHandler,
  searchJobsHandler,
  searchPeopleHandler,
  recommendationsHandler,
  listSavedSearchesHandler,
  createSavedSearchHandler,
  removeSavedSearchHandler,
} from './search.controller.js';

const router = Router();

router.get('/', requireAuth, searchAllHandler);
router.get('/jobs', searchJobsHandler);
router.get('/people', searchPeopleHandler);
router.get('/recommendations', ...recommendationsHandler);
router.get('/saved', ...listSavedSearchesHandler);
router.post('/saved', ...createSavedSearchHandler);
router.delete('/saved/:id', ...removeSavedSearchHandler);

export default router;
