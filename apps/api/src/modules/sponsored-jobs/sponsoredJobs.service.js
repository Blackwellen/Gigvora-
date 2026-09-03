import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

export async function list({ companyId, limit = 20, offset = 0 } = {}) {
  const cappedLimit = Math.min(Number(limit) || 20, 50);
  const filter = (qb) => {
    if (companyId) qb.andWhere('company_id', companyId);
  };
  const [rows, [{ count }]] = await Promise.all([
    db('sponsored_job_campaigns').modify(filter).orderBy('created_at', 'desc').limit(cappedLimit).offset(Number(offset) || 0),
    db('sponsored_job_campaigns').modify(filter).count({ count: '*' }),
  ]);
  return { items: rows, total: Number(count) };
}

export async function getById(id) {
  const record = await db('sponsored_job_campaigns').where({ id }).first();
  if (!record) throw new AppError('sponsored campaign not found', 404);
  return record;
}

export async function listByJob(jobId) {
  return db('sponsored_job_campaigns').where({ job_id: jobId }).orderBy('created_at', 'desc');
}

export async function create(data) {
  if (!data.jobId) throw new AppError('jobId is required', 400);
  const job = await db('jobs').where({ id: data.jobId }).first('id', 'company_id');
  if (!job) throw new AppError('job not found', 404);

  const [record] = await db('sponsored_job_campaigns')
    .insert({
      job_id: data.jobId,
      company_id: job.company_id,
      budget_total: data.budget,
      budget_daily: data.dailyCap ?? null,
      bid_type: data.bidType || 'cpc',
      bid_amount: data.bidAmount ?? 0,
      status: data.status || 'draft',
      starts_at: data.dateRange?.start || data.startsAt || null,
      ends_at: data.dateRange?.end || data.endsAt || null,
      targeting: JSON.stringify(data.targeting || {}),
    })
    .returning('*');
  return record;
}

const WRITABLE_FIELDS = {
  budget: 'budget_total',
  dailyCap: 'budget_daily',
  bidType: 'bid_type',
  bidAmount: 'bid_amount',
  status: 'status',
  startsAt: 'starts_at',
  endsAt: 'ends_at',
};

export async function update(id, data) {
  const fields = {};
  for (const [bodyKey, column] of Object.entries(WRITABLE_FIELDS)) {
    if (data[bodyKey] !== undefined) fields[column] = data[bodyKey];
  }
  if (data.dateRange?.start !== undefined) fields.starts_at = data.dateRange.start;
  if (data.dateRange?.end !== undefined) fields.ends_at = data.dateRange.end;
  if (data.targeting !== undefined) fields.targeting = JSON.stringify(data.targeting);

  const [record] = await db('sponsored_job_campaigns').where({ id }).update(fields).returning('*');
  if (!record) throw new AppError('sponsored campaign not found', 404);
  return record;
}

export async function events(campaignId) {
  const campaign = await db('sponsored_job_campaigns').where({ id: campaignId }).first('id');
  if (!campaign) throw new AppError('sponsored campaign not found', 404);

  const rows = await db('sponsored_job_events')
    .where({ campaign_id: campaignId })
    .select('event_type')
    .count({ count: '*' })
    .sum({ cost: 'cost' })
    .groupBy('event_type');

  const summary = { impression: 0, click: 0, apply: 0 };
  let totalCost = 0;
  for (const row of rows) {
    summary[row.event_type] = Number(row.count);
    totalCost += Number(row.cost || 0);
  }

  const timeline = await db('sponsored_job_events')
    .where({ campaign_id: campaignId })
    .select(db.raw("date_trunc('day', occurred_at) as day"), 'event_type')
    .count({ count: '*' })
    .groupBy('day', 'event_type')
    .orderBy('day', 'asc');

  return {
    impressions: summary.impression,
    clicks: summary.click,
    applies: summary.apply,
    ctr: summary.impression > 0 ? Number(((summary.click / summary.impression) * 100).toFixed(2)) : 0,
    conversionRate: summary.click > 0 ? Number(((summary.apply / summary.click) * 100).toFixed(2)) : 0,
    totalCost: Number(totalCost.toFixed(2)),
    timeline,
  };
}
