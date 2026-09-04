import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { resolveRecruiterCompanyId } from '../../common/utils/resolveRecruiterCompany.js';

const OUTREACH_SUMMARIES = {
  sent: 'Message sent',
  opened: 'Message opened',
  clicked: 'Link clicked',
  replied: 'Candidate replied',
  bounced: 'Message bounced',
  unsubscribed: 'Candidate unsubscribed',
  connected: 'Connection accepted',
  viewed: 'Profile viewed',
};

const COLLAB_SUMMARIES = {
  comment: 'Comment added',
  mention: 'Mentioned in a comment',
  stage_move: 'Moved to a new stage',
  assignment: 'Assigned to a recruiter',
  note: 'Note added',
  status_change: 'Status changed',
};

export async function listActivity(userId, candidateId) {
  if (!candidateId) throw new AppError('candidateId is required', 422);
  const companyId = await resolveRecruiterCompanyId(userId);

  const outreachRows = await db('outreach_events as e')
    .join('sequence_enrollments as en', 'en.id', 'e.enrollment_id')
    .join('recruiter_sequences as s', 's.id', 'en.sequence_id')
    .where('s.company_id', companyId)
    .andWhere('e.candidate_user_id', candidateId)
    .select('e.id', 'e.event_type', 'e.channel', 'e.occurred_at', 'e.metadata');

  const campaignRows = await db('outreach_events as e')
    .join('outreach_campaigns as c', 'c.id', 'e.campaign_id')
    .where('c.company_id', companyId)
    .andWhere('e.candidate_user_id', candidateId)
    .select('e.id', 'e.event_type', 'e.channel', 'e.occurred_at', 'e.metadata');

  const collabRows = await db('recruiter_collaboration_events as e')
    .join('pipeline_candidates as pc', 'pc.id', 'e.pipeline_candidate_id')
    .leftJoin('users as u', 'u.id', 'e.actor_user_id')
    .where('e.company_id', companyId)
    .andWhere('pc.candidate_user_id', candidateId)
    .select('e.id', 'e.event_type', 'e.body', 'e.created_at', 'u.first_name', 'u.last_name');

  const pipelineRows = await db('pipeline_candidates as pc')
    .join('pipeline_stages as st', 'st.id', 'pc.stage_id')
    .where('pc.candidate_user_id', candidateId)
    .select('pc.id', 'pc.moved_at', 'pc.added_by_user_id', 'st.name as stage_name');

  const events = [];

  for (const row of [...outreachRows, ...campaignRows]) {
    events.push({
      id: `outreach-${row.id}`,
      source: 'outreach',
      event_type: row.event_type,
      channel: row.channel,
      actor_name: null,
      summary: OUTREACH_SUMMARIES[row.event_type] || row.event_type,
      created_at: row.occurred_at,
    });
  }

  for (const row of collabRows) {
    const actorName = row.first_name || row.last_name ? `${row.first_name || ''} ${row.last_name || ''}`.trim() : null;
    events.push({
      id: `collaboration-${row.id}`,
      source: 'collaboration',
      event_type: row.event_type,
      channel: null,
      actor_name: actorName,
      summary: row.body ? row.body : COLLAB_SUMMARIES[row.event_type] || row.event_type,
      created_at: row.created_at,
    });
  }

  for (const row of pipelineRows) {
    events.push({
      id: `pipeline-${row.id}`,
      source: 'pipeline',
      event_type: 'stage_move',
      channel: null,
      actor_name: null,
      summary: `Moved to ${row.stage_name}`,
      created_at: row.moved_at,
    });
  }

  events.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return events;
}
