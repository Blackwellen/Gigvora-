import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import {
  listHandler,
  createHandler,
  getHandler,
  updateHandler,
  cancelHandler,
  respondHandler,
  addNoteHandler,
  addActionItemHandler,
  updateActionItemHandler,
  suggestSlotsHandler,
  detectConflictsHandler,
  suggestAgendaHandler,
} from './meetings.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/', listHandler);
router.post('/', createHandler);
router.post('/suggest-slots', suggestSlotsHandler);
router.post('/detect-conflicts', detectConflictsHandler);
router.post('/suggest-agenda', suggestAgendaHandler);

router.get('/:id', getHandler);
router.patch('/:id', updateHandler);
router.post('/:id/cancel', cancelHandler);
router.post('/:id/respond', respondHandler);
router.post('/:id/notes', addNoteHandler);
router.post('/:id/action-items', addActionItemHandler);
router.patch('/:id/action-items/:actionItemId', updateActionItemHandler);

export default router;
