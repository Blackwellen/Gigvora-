import { db } from '../../db/connection.js';
import { resolveRecruiterCompanyId } from '../../common/utils/resolveRecruiterCompany.js';

function pct(numerator, denominator) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export async function getOverview(userId) {
  const companyId = await resolveRecruiterCompanyId(userId);

  const campaigns = await db('outreach_campaigns').where({ company_id: companyId });
  const sequences = await db('recruiter_sequences').where({ company_id: companyId });
  const templates = await db('outreach_templates').where({ company_id: companyId }).orderBy('usage_count', 'desc').limit(5);

  const pipelineRows = await db('pipeline_candidates as pc')
    .join('pipeline_stages as st', 'st.id', 'pc.stage_id')
    .leftJoin('recruiter_projects as p', 'p.id', 'pc.project_id')
    .where('p.recruiter_id', userId)
    .select('st.name as stage_name', 'pc.id');

  const pipelineByStageMap = new Map();
  for (const row of pipelineRows) {
    pipelineByStageMap.set(row.stage_name, (pipelineByStageMap.get(row.stage_name) || 0) + 1);
  }
  const pipeline_by_stage = Array.from(pipelineByStageMap.entries()).map(([stage_name, count]) => ({ stage_name, count }));

  const activeCampaigns = campaigns.filter((c) => ['scheduled', 'sending'].includes(c.status));
  const totalSent = campaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0);
  const totalReplies = campaigns.reduce((sum, c) => sum + (c.reply_count || 0), 0);

  const totalEnrolled = sequences.reduce((sum, s) => sum + (s.enrolled_count || 0), 0);
  const totalCompleted = sequences.reduce((sum, s) => sum + (s.completed_count || 0), 0);

  const campaign_reply_rates = campaigns
    .filter((c) => c.sent_count > 0)
    .map((c) => ({ campaign_name: c.name, reply_rate_pct: pct(c.reply_count, c.sent_count) }));

  const sequence_completion_rates = sequences
    .filter((s) => s.enrolled_count > 0)
    .map((s) => ({ sequence_name: s.name, completion_pct: pct(s.completed_count, s.enrolled_count) }));

  const top_templates = templates.map((t) => ({
    template_name: t.name,
    usage_count: t.usage_count,
    reply_rate_pct: 0,
  }));

  return {
    kpis: {
      active_campaigns: activeCampaigns.length,
      avg_reply_rate_pct: pct(totalReplies, totalSent),
      avg_sequence_completion_pct: pct(totalCompleted, totalEnrolled),
      candidates_in_pipeline: pipelineRows.length,
    },
    pipeline_by_stage,
    campaign_reply_rates,
    sequence_completion_rates,
    top_templates,
  };
}
