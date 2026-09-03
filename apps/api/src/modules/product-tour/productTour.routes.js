import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import {
  getTourHandler,
  startTourHandler,
  stepTourHandler,
  completeTourHandler,
  dismissTourHandler,
} from './productTour.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/:tourKey', getTourHandler);
router.post('/:tourKey/start', startTourHandler);
router.post('/:tourKey/step', stepTourHandler);
router.post('/:tourKey/complete', completeTourHandler);
router.post('/:tourKey/dismiss', dismissTourHandler);

export default router;
