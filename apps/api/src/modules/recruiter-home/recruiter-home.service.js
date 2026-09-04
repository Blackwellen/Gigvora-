import { db } from '../../db/connection.js';

export async function getHome(recruiterId) {
  const [seat, savedTotal, activeProjects, activeAlerts, inboxUnread, recentSaves, recentNotes, upcomingProjects] = await Promise.all([
    db('recruiter_seats').where({ user_id: recruiterId }).first(),
    db('candidate_saves').where({ recruiter_id: recruiterId }).count({ c: '*' }).first(),
    db('recruiter_projects').where({ recruiter_id: recruiterId, status: 'active' }).count({ c: '*' }).first(),
    db('recruiter_search_alerts').where({ recruiter_id: recruiterId, status: 'active' }).count({ c: '*' }).first(),
    db('recruiter_inbox_threads as t')
      .join('conversations as c', 'c.id', 't.conversation_id')
      .join('conversation_participants as cp', function join() {
        this.on('cp.conversation_id', '=', 'c.id').andOn('cp.user_id', '=', db.raw('?', [recruiterId]));
      })
      .join('messages as m', 'm.conversation_id', 'c.id')
      .where('t.recruiter_id', recruiterId)
      .andWhere('t.status', 'active')
      .andWhere('m.sender_id', '!=', recruiterId)
      .andWhere((qb) => qb.whereNull('cp.last_read_at').orWhereRaw('m.created_at > cp.last_read_at'))
      .countDistinct({ c: 'c.id' })
      .first(),
    db('candidate_saves as cs')
      .join('users as u', 'u.id', 'cs.candidate_id')
      .where('cs.recruiter_id', recruiterId)
      .orderBy('cs.saved_at', 'desc')
      .limit(5)
      .select('cs.id', 'cs.candidate_id', 'cs.saved_at', 'cs.status', 'u.first_name', 'u.last_name', 'u.headline'),
    db('candidate_notes as n')
      .join('users as u', 'u.id', 'n.candidate_id')
      .where('n.recruiter_id', recruiterId)
      .orderBy('n.created_at', 'desc')
      .limit(5)
      .select('n.id', 'n.body', 'n.created_at', 'u.id as candidate_id', 'u.first_name', 'u.last_name'),
    db('recruiter_projects')
      .where({ recruiter_id: recruiterId, status: 'active' })
      .whereNotNull('target_date')
      .orderBy('target_date', 'asc')
      .limit(4),
  ]);

  return {
    seat: seat || null,
    kpis: {
      saved_candidates_total: Number(savedTotal?.c || 0),
      active_projects: Number(activeProjects?.c || 0),
      active_search_alerts: Number(activeAlerts?.c || 0),
      unread_inbox_conversations: Number(inboxUnread?.c || 0),
    },
    recent_saves: recentSaves.map((r) => ({ id: r.id, candidate_id: r.candidate_id, name: `${r.first_name} ${r.last_name}`.trim(), headline: r.headline, saved_at: r.saved_at, status: r.status })),
    recent_notes: recentNotes.map((r) => ({ id: r.id, body: r.body, created_at: r.created_at, candidate_id: r.candidate_id, candidate_name: `${r.first_name} ${r.last_name}`.trim() })),
    upcoming_projects: upcomingProjects,
  };
}
