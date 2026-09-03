import { db } from '../../db/connection.js';

/**
 * Copilot v0: a deterministic, data-grounded assistant — every number it
 * surfaces is a real query against the viewer's own authorized data (no LLM
 * call is wired up in this environment, so this intentionally does NOT
 * pretend to be a general-purpose model; it summarizes and answers from
 * real counts only, and never auto-publishes anything on the user's behalf).
 */
export async function getContextSummary(userId) {
  const since = new Date(Date.now() - 24 * 3600 * 1000);

  const [newPosts, unreadNotifications, unreadMessages, savedCount, pendingInvites] = await Promise.all([
    db('posts').whereNull('deleted_at').andWhere('created_at', '>', since).count('id as c').first(),
    db('notifications').where({ user_id: userId, is_read: false }).count('id as c').first(),
    db('messages as m')
      .join('conversation_participants as cp', function j() {
        this.on('cp.conversation_id', '=', 'm.conversation_id').andOn('cp.user_id', '=', db.raw('?', [userId]));
      })
      .where('m.sender_id', '!=', userId)
      .andWhere((qb) => qb.whereNull('cp.last_read_at').orWhereRaw('m.created_at > cp.last_read_at'))
      .count('m.id as c')
      .first(),
    db('saved_items').where({ user_id: userId }).count('id as c').first(),
    db('company_members').where({ user_id: userId, status: 'invited' }).count('id as c').first(),
  ]);

  return {
    newPosts: Number(newPosts?.c || 0),
    unreadNotifications: Number(unreadNotifications?.c || 0),
    unreadMessages: Number(unreadMessages?.c || 0),
    savedItems: Number(savedCount?.c || 0),
    pendingWorkspaceInvites: Number(pendingInvites?.c || 0),
  };
}

export async function ask(userId, message) {
  const summary = await getContextSummary(userId);
  const lower = (message || '').toLowerCase();

  if (lower.includes('summar')) {
    return {
      reply: `Here's what's new: ${summary.newPosts} new post${summary.newPosts === 1 ? '' : 's'} in the last 24h, ${summary.unreadNotifications} unread notification${summary.unreadNotifications === 1 ? '' : 's'}, and ${summary.unreadMessages} unread message${summary.unreadMessages === 1 ? '' : 's'}.`,
      citations: [{ label: 'Live Feed', route: '/app/live-feed' }, { label: 'Notifications', route: '/app/notifications-tray' }],
    };
  }
  if (lower.includes('draft') || lower.includes('post about')) {
    return {
      reply: `I've started a draft for you in the composer — review and edit it before publishing. Copilot never posts on your behalf.`,
      draftPost: message.replace(/draft a post about/i, '').trim() || 'Excited to share an update...',
      citations: [],
    };
  }
  if (lower.includes('saved')) {
    return { reply: `You have ${summary.savedItems} saved item${summary.savedItems === 1 ? '' : 's'}.`, citations: [{ label: 'Saved Items', route: '/app/saved-items' }] };
  }

  return {
    reply: `You have ${summary.unreadNotifications} unread notifications and ${summary.unreadMessages} unread messages. Ask me to "summarize my feed" or "draft a post about..." to get started.`,
    citations: [],
  };
}
