import { db } from '../../db/connection.js';
import { hydratePosts } from '../posts/posts.service.js';
import { jobBaseQuery, toJobSummary, companyBaseQuery, toCompanySummary } from '../public-directory/public-directory.service.js';

/**
 * Real targeting match: an eligible campaign's targeting_json is checked
 * against the VIEWER's own real profile fields — no ad is ever served to a
 * viewer it wasn't actually targeted at. Empty/unset targeting criteria are
 * treated as "no restriction on this dimension", not "match everyone by
 * default bypassing the other set criteria".
 */
async function viewerMatchesTargeting(viewerId, targeting) {
  if (!viewerId) return !targeting || Object.keys(targeting).length === 0;
  if (!targeting || Object.keys(targeting).length === 0) return true;

  const profile = await db('profiles').where({ user_id: viewerId }).first('location', 'industry', 'skills', 'open_to_work');
  if (!profile) return false;

  if (targeting.openToWorkOnly && !profile.open_to_work) return false;
  if (Array.isArray(targeting.locations) && targeting.locations.length) {
    if (!profile.location || !targeting.locations.some((l) => profile.location.toLowerCase().includes(String(l).toLowerCase()))) return false;
  }
  if (Array.isArray(targeting.industries) && targeting.industries.length) {
    if (!profile.industry || !targeting.industries.some((i) => String(i).toLowerCase() === profile.industry.toLowerCase())) return false;
  }
  if (Array.isArray(targeting.skills) && targeting.skills.length) {
    const profileSkills = (profile.skills || []).map((s) => String(s).toLowerCase());
    if (!targeting.skills.some((s) => profileSkills.includes(String(s).toLowerCase()))) return false;
  }
  return true;
}

/** Real budget/eligibility gate: active, within date range, both daily and total budget remaining, creative approved. Ordered by random() for fair rotation among ties, not always the same advertiser. */
function eligibleCampaignsQuery(objective) {
  return db('ad_campaigns as c')
    .join('ad_creatives as cr', 'cr.campaign_id', 'c.id')
    .where('c.objective', objective)
    .andWhere('c.status', 'active')
    .andWhere('cr.review_status', 'approved')
    .andWhere('c.start_date', '<=', db.raw('CURRENT_DATE'))
    .andWhere((qb) => qb.whereNull('c.end_date').orWhere('c.end_date', '>=', db.raw('CURRENT_DATE')))
    .andWhereRaw('c.spent_cents < c.total_budget_cents')
    .andWhereRaw('(c.spend_day != CURRENT_DATE OR c.spent_today_cents < c.daily_budget_cents)')
    .select('c.*', 'cr.id as creative_id', 'cr.content_id', 'cr.headline', 'cr.destination_url')
    .orderByRaw('random()');
}

export async function getSponsoredFeedPost(viewerId) {
  const candidates = await eligibleCampaignsQuery('post_engagement').limit(10);
  for (const candidate of candidates) {
    // eslint-disable-next-line no-await-in-loop
    if (await viewerMatchesTargeting(viewerId, candidate.targeting_json)) {
      // eslint-disable-next-line no-await-in-loop
      const postRow = await db('posts').where({ id: candidate.content_id }).whereNull('deleted_at').first();
      if (!postRow) continue; // underlying content was deleted since the campaign was created — skip, don't serve a broken ad
      // eslint-disable-next-line no-await-in-loop
      const [hydrated] = await hydratePosts([postRow], viewerId);
      return { ...hydrated, sponsored: true, campaignId: candidate.id, creativeId: candidate.creative_id, headline: candidate.headline, destinationUrl: candidate.destination_url };
    }
  }
  return null;
}

export async function getPromotedJob(viewerId, filters = {}) {
  const candidates = await eligibleCampaignsQuery('job_promotion').limit(10);
  for (const candidate of candidates) {
    // eslint-disable-next-line no-await-in-loop
    if (!(await viewerMatchesTargeting(viewerId, candidate.targeting_json))) continue;
    // eslint-disable-next-line no-await-in-loop
    const jobRow = await jobBaseQuery().where('jobs.id', candidate.content_id).andWhere('jobs.status', 'open').first();
    if (!jobRow) continue;
    // Respect the searcher's own filters — a promoted job irrelevant to what
    // they're searching for is still not shown, real relevance not just "pay
    // to appear regardless of query".
    if (filters.q && !jobRow.title.toLowerCase().includes(String(filters.q).toLowerCase()) && !jobRow.company_name.toLowerCase().includes(String(filters.q).toLowerCase())) continue;
    if (filters.location && !(jobRow.location || '').toLowerCase().includes(String(filters.location).toLowerCase())) continue;
    return { ...toJobSummary(jobRow), sponsored: true, campaignId: candidate.id, creativeId: candidate.creative_id, headline: candidate.headline };
  }
  return null;
}

export async function getPromotedCompany(viewerId, filters = {}) {
  const candidates = await eligibleCampaignsQuery('company_awareness').limit(10);
  for (const candidate of candidates) {
    // eslint-disable-next-line no-await-in-loop
    if (!(await viewerMatchesTargeting(viewerId, candidate.targeting_json))) continue;
    // eslint-disable-next-line no-await-in-loop
    const companyRow = await companyBaseQuery().where('companies.id', candidate.content_id).first();
    if (!companyRow) continue;
    if (filters.q && !companyRow.name.toLowerCase().includes(String(filters.q).toLowerCase())) continue;
    if (filters.industry && companyRow.industry !== filters.industry) continue;
    return { ...toCompanySummary(companyRow), sponsored: true, campaignId: candidate.id, creativeId: candidate.creative_id, headline: candidate.headline };
  }
  return null;
}

/**
 * Atomic spend accounting: rolls the daily counter over if the stored
 * spend_day isn't today, increments both counters + lifetime total in one
 * transaction, auto-pauses the campaign the instant its total budget is
 * exhausted (never overspends past the advertiser's real budget), and
 * writes a real, reconcilable ad_billing_events row.
 */
async function accrueSpend({ campaignId, creativeId, accountId, viewerId, surface, costCents, table }) {
  return db.transaction(async (trx) => {
    // Single atomic UPDATE, entirely in Postgres: `spend_day` and
    // CURRENT_DATE are compared server-side as the same column type in the
    // same session timezone, so there's no JS Date-vs-ISO-string mismatch
    // (an earlier version compared `new Date().toISOString()` against the
    // driver's parsed DATE object in JS and got it wrong across timezones —
    // caught by a real end-to-end test showing spent_today_cents resetting
    // on every call instead of accumulating). This also closes the
    // read-then-write race a separate SELECT-then-UPDATE would have between
    // concurrent impressions on the same campaign.
    const rows = await trx('ad_campaigns')
      .where({ id: campaignId, status: 'active' })
      .update({
        spent_cents: trx.raw('spent_cents + ?', [costCents]),
        spent_today_cents: trx.raw('CASE WHEN spend_day = CURRENT_DATE THEN spent_today_cents + ? ELSE ? END', [costCents, costCents]),
        spend_day: trx.raw('CURRENT_DATE'),
        status: trx.raw('CASE WHEN spent_cents + ? >= total_budget_cents THEN ? ELSE status END', [costCents, 'completed']),
        updated_at: trx.fn.now(),
      })
      .returning('id');

    if (!rows.length) return; // campaign was paused/ended between selection and recording — don't charge for it

    await trx(table).insert({ campaign_id: campaignId, creative_id: creativeId, viewer_user_id: viewerId || null, surface, cost_cents: costCents });
    await trx('ad_billing_events').insert({ account_id: accountId, campaign_id: campaignId, type: 'spend_accrued', amount_cents: costCents, metadata: JSON.stringify({ surface, table }) });
    await trx('ad_accounts').where({ id: accountId }).increment('lifetime_spend_cents', costCents);
  });
}

export async function recordImpression({ campaignId, creativeId, viewerId, surface }) {
  const campaign = await db('ad_campaigns').where({ id: campaignId }).first('account_id', 'cost_per_impression_cents');
  if (!campaign) return;
  await accrueSpend({ campaignId, creativeId, accountId: campaign.account_id, viewerId, surface, costCents: campaign.cost_per_impression_cents, table: 'ad_impressions' });
}

export async function recordClick({ campaignId, creativeId, viewerId, surface }) {
  const campaign = await db('ad_campaigns').where({ id: campaignId }).first('account_id', 'cost_per_click_cents');
  if (!campaign) return;
  await accrueSpend({ campaignId, creativeId, accountId: campaign.account_id, viewerId, surface, costCents: campaign.cost_per_click_cents, table: 'ad_clicks' });
}
