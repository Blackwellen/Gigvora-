import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { userRateLimit } from '../../common/middleware/userRateLimit.js';
import {
  listHandler,
  unreadCountHandler,
  listGroupsHandler,
  getHandler,
  startDirectHandler,
  createConversationHandler,
  listChannelsHandler,
  joinChannelHandler,
  getMessagesHandler,
  sendMessageHandler,
  markReadHandler,
  updateHandler,
  removeHandler,
  addReactionHandler,
  removeReactionHandler,
  pinMessageHandler,
  unpinMessageHandler,
  getPinsHandler,
  updateMembershipHandler,
  createPollHandler,
  votePollHandler,
  getPollHandler,
  smartRepliesHandler,
  summarizeHandler,
  latestSummaryHandler,
  conversationDetailHandler,
  listByContextHandler,
} from './messaging.controller.js';

const router = Router();
router.use(requireAuth);

// Abuse-aware, generous enough for normal professional messaging (spec
// §76: "do not impair normal professional communication"). Message sends
// are the highest-volume action so get the highest ceiling; conversation
// creation and AI-touching endpoints are the more expensive/abuse-prone
// ones and get tighter limits.
const sendMessageLimit = userRateLimit({ keyPrefix: 'msg-send', windowSeconds: 60, max: 60 });
const createConversationLimit = userRateLimit({ keyPrefix: 'conv-create', windowSeconds: 60, max: 20 });
const aiFeatureLimit = userRateLimit({ keyPrefix: 'msg-ai', windowSeconds: 60, max: 20 });

router.get('/', listHandler);
router.get('/unread-count', unreadCountHandler);
router.get('/channels', listChannelsHandler);
// Must be registered before the generic '/:id' route below, or Express would
// match 'groups' as an :id param.
router.get('/groups', listGroupsHandler);
// Server-enforced gate lives inside listByContextHandler (sales/enterprise
// require plan features regardless of what the client thinks it can see).
router.get('/context/:contextType', listByContextHandler);
router.post('/', createConversationLimit, createConversationHandler);
router.post('/direct', createConversationLimit, startDirectHandler);
router.post('/:id/join', joinChannelHandler);

router.post('/polls/:pollId/vote', votePollHandler);
router.get('/polls/:pollId', getPollHandler);

router.get('/:id', getHandler);
router.get('/:id/messages', getMessagesHandler);
router.post('/:id/messages', sendMessageLimit, sendMessageHandler);
router.post('/:id/read', markReadHandler);
router.patch('/:id', updateHandler);
router.delete('/:id', removeHandler);

router.post('/:id/messages/:messageId/reactions', addReactionHandler);
router.delete('/:id/messages/:messageId/reactions/:reaction', removeReactionHandler);
router.post('/:id/messages/:messageId/pin', pinMessageHandler);
router.delete('/:id/messages/:messageId/pin', unpinMessageHandler);
router.get('/:id/pins', getPinsHandler);

router.patch('/:id/membership', updateMembershipHandler);

router.post('/:id/polls', createPollHandler);

router.post('/:id/smart-replies', aiFeatureLimit, smartRepliesHandler);
router.post('/:id/summary', aiFeatureLimit, summarizeHandler);
router.get('/:id/summary/latest', latestSummaryHandler);

router.get('/:id/detail', conversationDetailHandler);

export default router;
