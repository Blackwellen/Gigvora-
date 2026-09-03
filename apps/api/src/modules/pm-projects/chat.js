// Domain 18 Phase B — Project Chat (18.13). Deliberately thin: this does NOT
// implement a second messaging engine. It only (a) lazily provisions a
// Domain 10 group conversation for the project the first time it's needed,
// keeping every accepted member as a participant, and (b) hands back the
// conversationId so the web client can render the existing MessageThread
// component / `/app/conversation?id=` experience inside the project shell.
// All actual sending/streaming/typing/reactions/read-receipts continue to
// run through modules/messaging — nothing here duplicates that.
import { Router } from 'express';
import { db } from '../../db/connection.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { createConversation } from '../messaging/messaging.service.js';
import { loadProjectContext } from './shared.js';
import { assertPermission } from './permissions.js';

export const router = Router({ mergeParams: true });

router.get('/', asyncHandler(async (req, res) => {
  const { project, membership } = await loadProjectContext(req.params.id, req.user.sub);
  assertPermission(Boolean(membership), 'You do not have access to this project');

  if (project.conversation_id) {
    res.json({ data: { conversationId: project.conversation_id } });
    return;
  }

  const memberRows = await db('pm_project_members').where({ project_id: req.params.id, invitation_status: 'accepted' }).select('user_id');
  const conversation = await createConversation(req.user.sub, {
    type: 'group',
    title: `${project.name} — Project Chat`,
    participantIds: memberRows.map((m) => m.user_id),
  });

  await db('pm_projects').where({ id: req.params.id }).update({ conversation_id: conversation.id });
  res.json({ data: { conversationId: conversation.id } });
}));

export default router;
