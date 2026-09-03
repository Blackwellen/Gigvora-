import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { getTrendingHandler, getFeaturedCreatorsHandler, recomputeTrendingHandler } from './trending.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/', getTrendingHandler);
router.get('/featured-creators', getFeaturedCreatorsHandler);
router.post('/recompute', recomputeTrendingHandler);

export default router;
