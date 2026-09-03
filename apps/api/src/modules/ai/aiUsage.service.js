import { db } from '../../db/connection.js';

/**
 * Every number here is a real aggregate over ai_usage rows this user's own
 * AI activity has actually generated (Copilot generations, smart replies,
 * summaries, safety classifications) — never simulated. A brand-new account
 * with no AI activity yet will correctly show all-zero KPIs, not a demo
 * dataset.
 */
export async function getOverview(userId, { from, to } = {}) {
  const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDate = to ? new Date(to) : new Date();

  const base = db('ai_usage').where({ user_id: userId }).andWhere('created_at', '>=', fromDate).andWhere('created_at', '<', toDate);

  const [totals, byModel, byDay] = await Promise.all([
    base
      .clone()
      .select(
        db.raw('count(*) as total_requests'),
        db.raw('coalesce(sum(input_tokens + output_tokens), 0) as total_tokens'),
        db.raw('coalesce(sum(cost_estimate), 0) as total_cost'),
        db.raw("coalesce(avg(case when success then 1.0 else 0.0 end), 0) as success_rate"),
        db.raw('coalesce(avg(latency_ms), 0) as avg_latency_ms')
      )
      .first(),
    base.clone().select('model').count('id as count').groupBy('model').orderBy('count', 'desc'),
    base
      .clone()
      .select(db.raw("to_char(created_at, 'YYYY-MM-DD') as day"))
      .count('id as requests')
      .sum({ tokens: db.raw('input_tokens + output_tokens') })
      .groupBy('day')
      .orderBy('day', 'asc'),
  ]);

  return {
    totalRequests: Number(totals.total_requests),
    totalTokens: Number(totals.total_tokens),
    totalCost: Number(totals.total_cost),
    successRate: Number(totals.success_rate),
    avgLatencyMs: Number(totals.avg_latency_ms),
    byModel: byModel.map((r) => ({ model: r.model, count: Number(r.count) })),
    trend: byDay.map((r) => ({ day: r.day, requests: Number(r.requests), tokens: Number(r.tokens || 0) })),
  };
}
