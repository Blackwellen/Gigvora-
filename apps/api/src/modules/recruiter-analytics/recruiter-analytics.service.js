import { db } from '../../db/connection.js';

/**
 * Recruiter Standard analytics — aggregates the recruiter's own activity
 * (saves, notes, projects, shortlists, inbox). Deliberately basic: no
 * cross-recruiter benchmarking or AI-generated insight narratives, which are
 * Recruiter Pro / Domain 21 concerns.
 */
export async function getOverview(recruiterId) {
  const [savedTotal, savedByStatus, notesTotal, projects, shortlists, pools, alerts, threads, pipelineByStage] = await Promise.all([
    db('candidate_saves').where({ recruiter_id: recruiterId }).count({ c: '*' }).first(),
    db('candidate_saves').where({ recruiter_id: recruiterId }).groupBy('status').select('status').count({ c: '*' }),
    db('candidate_notes').where({ recruiter_id: recruiterId }).count({ c: '*' }).first(),
    db('recruiter_projects').where({ recruiter_id: recruiterId }),
    db('recruiter_shortlists').where({ recruiter_id: recruiterId }).count({ c: '*' }).first(),
    db('recruiter_talent_pools').where({ recruiter_id: recruiterId }).count({ c: '*' }).first(),
    db('recruiter_search_alerts').where({ recruiter_id: recruiterId, status: 'active' }).count({ c: '*' }).first(),
    db('recruiter_inbox_threads').where({ recruiter_id: recruiterId, status: 'active' }).count({ c: '*' }).first(),
    db('recruiter_project_members as m')
      .join('recruiter_projects as p', 'p.id', 'm.project_id')
      .where('p.recruiter_id', recruiterId)
      .groupBy('m.stage')
      .select('m.stage')
      .count({ c: '*' }),
  ]);

  const activeProjects = projects.filter((p) => p.status === 'active');
  const totalTargetHires = projects.reduce((sum, p) => sum + p.target_hires, 0);
  const totalFilledHires = projects.reduce((sum, p) => sum + p.filled_hires, 0);

  const savedByStatusMap = Object.fromEntries(savedByStatus.map((r) => [r.status, Number(r.c)]));
  const pipelineByStageMap = Object.fromEntries(pipelineByStage.map((r) => [r.stage, Number(r.c)]));

  // Last-30-days saved-candidates trend (day-by-day counts) for a simple sparkline.
  const trendRows = await db('candidate_saves')
    .where({ recruiter_id: recruiterId })
    .andWhere('saved_at', '>=', db.raw("current_date - interval '29 days'"))
    .select(db.raw("date_trunc('day', saved_at) as day"))
    .count({ c: '*' })
    .groupBy(db.raw("date_trunc('day', saved_at)"))
    .orderBy('day', 'asc');

  return {
    kpis: {
      saved_candidates_total: Number(savedTotal?.c || 0),
      saved_candidates_by_status: savedByStatusMap,
      candidate_notes_total: Number(notesTotal?.c || 0),
      active_projects: activeProjects.length,
      total_projects: projects.length,
      target_hires: totalTargetHires,
      filled_hires: totalFilledHires,
      fill_rate_pct: totalTargetHires ? Math.round((totalFilledHires / totalTargetHires) * 1000) / 10 : 0,
      shortlists_total: Number(shortlists?.c || 0),
      talent_pools_total: Number(pools?.c || 0),
      active_search_alerts: Number(alerts?.c || 0),
      active_inbox_threads: Number(threads?.c || 0),
    },
    pipeline_by_stage: pipelineByStageMap,
    saved_candidates_trend_30d: trendRows.map((r) => ({ date: r.day, count: Number(r.c) })),
  };
}
