import { db } from '../../db/connection.js';

const TABLE = 'calendar_events';

/**
 * Auth-scoped list for the top-bar calendar widget: the current user's
 * events within [from, to), soonest first. Defaults to "from now" through
 * 30 days out when no range is given.
 */
export async function listUpcoming(userId, { from, to, limit = 10 } = {}) {
  const fromDate = from ? new Date(from) : new Date();
  const toDate = to ? new Date(to) : new Date(fromDate.getTime() + 30 * 24 * 60 * 60 * 1000);

  const rows = await db(TABLE)
    .where({ user_id: userId })
    .andWhere('starts_at', '>=', fromDate)
    .andWhere('starts_at', '<', toDate)
    .orderBy('starts_at', 'asc')
    .limit(limit)
    .select('id', 'title', 'description', 'location', 'starts_at', 'ends_at', 'all_day', 'created_at');

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    location: r.location,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    allDay: r.all_day,
    createdAt: r.created_at,
  }));
}
