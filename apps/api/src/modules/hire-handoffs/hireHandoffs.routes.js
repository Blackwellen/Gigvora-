import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { byApplicationHandler, createHandler, updateHandler } from './hireHandoffs.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/by-application/:applicationId', byApplicationHandler);
router.post('/', createHandler);
router.patch('/:id', updateHandler);

export default router;
