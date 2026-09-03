import { db } from '../../db/connection.js';
import { getOwnProfileId } from './shared.js';

/**
 * §41 & §91: only reads authoritative aggregates from profile_metrics_daily
 * (populated by recordProfileView + future portfolio/video/message event
 * hooks). No hardcoded reference values, no fabricated percentiles — a
 * cohort benchmark is returned only when enough peer data actually exists,
 * otherwise `benchmark: null`.
 */
export async function getSeries(userId, { days = 30 } = {}) {
  const profileId = await getOwnProfileId(userId);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const rows = await db('profile_metrics_daily').where({ profile_id: profileId }).andWhere('metric_date', '>=', since).orderBy('metric_date', 'asc');

  const totals = rows.reduce(
    (acc, r) => {
      acc.profileViews += r.profile_views;
      acc.searchAppearances += r.search_appearances;
      acc.recruiterViews += r.recruiter_views;
      acc.gigInquiries += r.gig_inquiries;
      acc.projectLeads += r.project_leads;
      acc.portfolioClicks += r.portfolio_clicks;
      acc.videoEngagements += r.video_engagements;
      acc.newFollowers += r.new_followers;
      acc.messagesStarted += r.messages_started;
      return acc;
    },
    { profileViews: 0, searchAppearances: 0, recruiterViews: 0, gigInquiries: 0, projectLeads: 0, portfolioClicks: 0, videoEngagements: 0, newFollowers: 0, messagesStarted: 0 }
  );

  const priorSince = new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const priorRows = await db('profile_metrics_daily').where({ profile_id: profileId }).andWhere('metric_date', '>=', priorSince).andWhere('metric_date', '<', since);
  const priorViews = priorRows.reduce((acc, r) => acc + r.profile_views, 0);
  const viewsChangePct = priorViews > 0 ? Math.round(((totals.profileViews - priorViews) / priorViews) * 1000) / 10 : null;

  // §91: percentile/cohort claims require a real peer cohort of sufficient
  // size. Without an actual cohort segmentation pipeline wired up yet, we
  // report that honestly instead of manufacturing a "Top X%" figure.
  const cohortSampleSize = null;
  const benchmark = null;

  return {
    days,
    daily: rows.map((r) => ({
      date: r.metric_date,
      profileViews: r.profile_views,
      searchAppearances: r.search_appearances,
      recruiterViews: r.recruiter_views,
      portfolioClicks: r.portfolio_clicks,
    })),
    totals,
    viewsChangePct,
    benchmark,
    cohortSampleSize,
  };
}
