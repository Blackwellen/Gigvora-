import { db } from '../../db/connection.js';
import { resolveRecruiterCompanyId } from '../../common/utils/resolveRecruiterCompany.js';

export async function getHome(userId) {
  const companyId = await resolveRecruiterCompanyId(userId);

  const [activePipelineCount, campaignsRunning, sequencesActive, alertsUnread, recentCollaboration] = await Promise.all([
    db('pipeline_candidates')
      .join('recruiter_projects', 'recruiter_projects.id', 'pipeline_candidates.project_id')
      .where('recruiter_projects.recruiter_id', userId)
      .count('pipeline_candidates.id as count')
      .first(),
    db('outreach_campaigns').where({ company_id: companyId }).whereIn('status', ['scheduled', 'sending']).count('id as count').first(),
    db('recruiter_sequences').where({ company_id: companyId, status: 'active' }).count('id as count').first(),
    db('advanced_alerts').where({ company_id: companyId, is_read: false }).count('id as count').first(),
    db('recruiter_collaboration_events')
      .join('users', 'users.id', 'recruiter_collaboration_events.actor_user_id')
      .leftJoin('profiles', 'profiles.user_id', 'users.id')
      .where('recruiter_collaboration_events.company_id', companyId)
      .orderBy('recruiter_collaboration_events.created_at', 'desc')
      .limit(10)
      .select(
        'recruiter_collaboration_events.id',
        'recruiter_collaboration_events.event_type',
        'recruiter_collaboration_events.body',
        'recruiter_collaboration_events.created_at',
        db.raw("concat(users.first_name, ' ', users.last_name) as actor_name"),
        'profiles.avatar_url as actor_avatar_url',
      ),
  ]);

  return {
    kpis: {
      active_pipeline_count: Number(activePipelineCount?.count || 0),
      campaigns_running: Number(campaignsRunning?.count || 0),
      sequences_active: Number(sequencesActive?.count || 0),
      alerts_unread: Number(alertsUnread?.count || 0),
    },
    recent_collaboration: recentCollaboration.map((row) => ({
      id: row.id,
      event_type: row.event_type,
      actor_name: row.actor_name,
      actor_avatar_url: row.actor_avatar_url || null,
      summary: row.body || row.event_type,
      created_at: row.created_at,
    })),
  };
}
