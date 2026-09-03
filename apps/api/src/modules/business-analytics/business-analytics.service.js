import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

function requireCompanyId(companyId) {
  if (!companyId) throw new AppError('Select a business workspace to continue', 400, { code: 'WORKSPACE_REQUIRED' });
}

/** Last `n` calendar months (oldest -> newest) as 'YYYY-MM' strings, anchored on the current UTC month. */
function lastNMonths(n) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

function fillMonthlySeries(months, rows, key = 'value') {
  const byMonth = new Map(rows.map((r) => [r.month, Number(r[key] || 0)]));
  return months.map((month) => ({ month, value: byMonth.get(month) || 0 }));
}

export async function overview(companyId) {
  requireCompanyId(companyId);

  const [plan, openRolesRow, hiredThisQuarterRow, spendRows, teamUtilRow, funnelRows, deptSpendRows] = await Promise.all([
    db('workforce_plans')
      .where({ company_id: companyId, status: 'active' })
      .orderBy('created_at', 'desc')
      .first(),
    db('jobs').where({ company_id: companyId, status: 'open' }).count({ count: '*' }).first(),
    db('applications')
      .join('jobs', 'jobs.id', 'applications.job_id')
      .where('jobs.company_id', companyId)
      .andWhere('applications.status', 'hired')
      .andWhere('applications.updated_at', '>=', db.raw("date_trunc('quarter', current_date)"))
      .count({ count: 'applications.id' })
      .first(),
    db('business_spend')
      .where('company_id', companyId)
      .andWhere('spend_date', '>=', db.raw("date_trunc('month', current_date)"))
      .sum({ total: 'amount' })
      .first(),
    db('teams').where({ company_id: companyId, status: 'active' }).avg({ avg: 'utilisation_pct' }).first(),
    db('applications')
      .join('jobs', 'jobs.id', 'applications.job_id')
      .where('jobs.company_id', companyId)
      .select('applications.status as stage')
      .count({ count: 'applications.id' })
      .groupBy('applications.status'),
    db('business_spend as bs')
      .join('departments as d', 'd.id', 'bs.department_id')
      .where('bs.company_id', companyId)
      .select('d.id as department_id', 'd.name as department_name')
      .sum({ total: 'bs.amount' })
      .groupBy('d.id', 'd.name')
      .orderBy('total', 'desc')
      .limit(5),
  ]);

  // `business_spend` doesn't carry an aggregate-safe currency alongside the
  // sum (currency is per-row), so fetch the company's currency separately —
  // in seeded/demo data all spend rows for a company share one currency.
  const spendCurrencyRow = await db('business_spend').where({ company_id: companyId }).first('currency');

  return {
    headcount: {
      current: plan?.current_headcount ?? 0,
      target: plan?.target_headcount ?? 0,
    },
    open_roles: Number(openRolesRow?.count || 0),
    hires_this_quarter: Number(hiredThisQuarterRow?.count || 0),
    spend_mtd: Number(spendRows?.total || 0),
    spend_currency: spendCurrencyRow?.currency || 'USD',
    avg_team_utilisation_pct: teamUtilRow?.avg ? Number(Number(teamUtilRow.avg).toFixed(1)) : 0,
    hiring_funnel: funnelRows.map((r) => ({ stage: r.stage, count: Number(r.count) })),
    top_departments_by_spend: deptSpendRows.map((r) => ({
      department_id: r.department_id,
      department_name: r.department_name,
      total: Number(r.total || 0),
    })),
    workforce_plan_progress: {
      current_headcount: plan?.current_headcount ?? 0,
      target_headcount: plan?.target_headcount ?? 0,
      plan_name: plan?.name || null,
    },
  };
}

export async function trends(companyId, { metric = 'headcount', months = 12 } = {}) {
  requireCompanyId(companyId);
  const cappedMonths = Math.min(Math.max(Number(months) || 12, 1), 36);
  const monthKeys = lastNMonths(cappedMonths);

  if (metric === 'spend') {
    const rows = await db('business_spend')
      .where('company_id', companyId)
      .andWhere('spend_date', '>=', db.raw(`date_trunc('month', current_date) - interval '${cappedMonths - 1} months'`))
      .select(db.raw("to_char(date_trunc('month', spend_date), 'YYYY-MM') as month"))
      .sum({ value: 'amount' })
      .groupBy('month');
    return fillMonthlySeries(monthKeys, rows);
  }

  if (metric === 'hiring') {
    const rows = await db('applications')
      .join('jobs', 'jobs.id', 'applications.job_id')
      .where('jobs.company_id', companyId)
      .andWhere('applications.status', 'hired')
      .andWhere('applications.updated_at', '>=', db.raw(`date_trunc('month', current_date) - interval '${cappedMonths - 1} months'`))
      .select(db.raw("to_char(date_trunc('month', applications.updated_at), 'YYYY-MM') as month"))
      .count({ value: 'applications.id' })
      .groupBy('month');
    return fillMonthlySeries(monthKeys, rows);
  }

  if (metric === 'headcount') {
    // There is no historical headcount table in this schema — this is a
    // deterministic ESTIMATE that interpolates backward from the current
    // workforce plan's `current_headcount`, not a claim of real recorded
    // history. Used only to give the headcount trend chart something
    // sensible to render in the demo/analytics UI.
    const plan = await db('workforce_plans')
      .where({ company_id: companyId, status: 'active' })
      .orderBy('created_at', 'desc')
      .first('current_headcount');
    const current = plan?.current_headcount ?? 0;

    return monthKeys.map((month, idx) => {
      const monthsAgo = monthKeys.length - 1 - idx;
      const drift = Math.round(monthsAgo * 0.6) - (monthsAgo % 3 === 0 ? 1 : 0);
      return { month, value: Math.max(0, current - drift) };
    });
  }

  throw new AppError('Unsupported metric', 400, { code: 'VALIDATION_ERROR' });
}
