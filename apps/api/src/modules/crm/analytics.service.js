import { db, ownerScope } from './shared.js';

/**
 * CRM Home / reporting aggregates. All read-only — no mutations, no
 * emitEvent/logActivity calls. Every query is scoped to the requesting
 * owner via ownerScope, matching every other CRM read path.
 */

export async function overview(owner) {
  const [
    [{ count: contactCount }],
    [{ count: leadCount }],
    [{ count: accountCount }],
    [{ count: openOpportunityCount }],
    [{ sum: openPipelineValue }],
    [{ count: wonThisMonth }],
    [{ sum: wonValueThisMonth }],
    [{ count: overdueFollowups }],
  ] = await Promise.all([
    ownerScope(db('crm_contacts'), owner).whereNull('archived_at').count({ count: '*' }),
    ownerScope(db('crm_leads'), owner).whereNot({ lead_status: 'converted' }).andWhereNot({ lead_status: 'disqualified' }).count({ count: '*' }),
    ownerScope(db('crm_accounts'), owner).whereNull('archived_at').count({ count: '*' }),
    ownerScope(db('crm_opportunities'), owner).whereNull('closed_at').count({ count: '*' }),
    ownerScope(db('crm_opportunities'), owner).whereNull('closed_at').sum({ sum: 'value' }),
    ownerScope(db('crm_opportunities'), owner)
      .whereNotNull('closed_at')
      .whereNotNull('win_reason')
      .andWhere('closed_at', '>=', db.raw("date_trunc('month', now())"))
      .count({ count: '*' }),
    ownerScope(db('crm_opportunities'), owner)
      .whereNotNull('closed_at')
      .whereNotNull('win_reason')
      .andWhere('closed_at', '>=', db.raw("date_trunc('month', now())"))
      .sum({ sum: 'value' }),
    ownerScope(db('crm_followups'), owner).where({ status: 'open' }).andWhere('due_at', '<', db.fn.now()).count({ count: '*' }),
  ]);

  return {
    contactCount: Number(contactCount),
    leadCount: Number(leadCount),
    accountCount: Number(accountCount),
    openOpportunityCount: Number(openOpportunityCount),
    openPipelineValue: Number(openPipelineValue || 0),
    wonThisMonth: Number(wonThisMonth),
    wonValueThisMonth: Number(wonValueThisMonth || 0),
    overdueFollowups: Number(overdueFollowups),
  };
}

export async function pipelineFunnel(owner) {
  const stages = await ownerScope(db('crm_pipeline_stages'), owner).orderBy('order_index', 'asc');
  const rows = await ownerScope(db('crm_opportunities'), owner)
    .select('stage_id')
    .count({ count: '*' })
    .sum({ value: 'value' })
    .groupBy('stage_id');

  const byStage = new Map(rows.map((r) => [r.stage_id, { count: Number(r.count), value: Number(r.value || 0) }]));

  return stages.map((stage) => ({
    stageId: stage.id,
    label: stage.label,
    orderIndex: stage.order_index,
    isWon: stage.is_won,
    isLost: stage.is_lost,
    count: byStage.get(stage.id)?.count || 0,
    value: byStage.get(stage.id)?.value || 0,
  }));
}

export async function winLossTrend(owner, { months = 6 } = {}) {
  const rows = await ownerScope(db('crm_opportunities'), owner)
    .select(db.raw("to_char(date_trunc('month', closed_at), 'YYYY-MM') as month"))
    .select(db.raw("(win_reason is not null) as won"))
    .count({ count: '*' })
    .sum({ value: 'value' })
    .whereNotNull('closed_at')
    .andWhere('closed_at', '>=', db.raw(`now() - interval '${Number(months) || 6} months'`))
    .groupByRaw("date_trunc('month', closed_at), (win_reason is not null)")
    .orderBy('month', 'asc');

  const byMonth = new Map();
  for (const row of rows) {
    if (!byMonth.has(row.month)) byMonth.set(row.month, { month: row.month, wonCount: 0, wonValue: 0, lostCount: 0, lostValue: 0 });
    const bucket = byMonth.get(row.month);
    if (row.won) {
      bucket.wonCount = Number(row.count);
      bucket.wonValue = Number(row.value || 0);
    } else {
      bucket.lostCount = Number(row.count);
      bucket.lostValue = Number(row.value || 0);
    }
  }

  return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
}

export async function leadSources(owner) {
  const rows = await ownerScope(db('crm_leads'), owner)
    .select('lead_source')
    .count({ total: '*' })
    .sum({ convertedCount: db.raw("case when lead_status = 'converted' then 1 else 0 end") })
    .groupBy('lead_source')
    .orderBy('total', 'desc');

  return rows.map((r) => {
    const total = Number(r.total);
    const converted = Number(r.convertedCount || 0);
    return {
      leadSource: r.lead_source || 'unknown',
      total,
      converted,
      conversionRate: total > 0 ? Number((converted / total).toFixed(4)) : 0,
    };
  });
}

export async function topAccounts(owner, { limit = 10 } = {}) {
  const rows = await ownerScope(db('crm_accounts'), owner)
    .whereNull('archived_at')
    .leftJoin(
      db('crm_opportunities').whereNull('closed_at').select('account_id').sum({ open_value: 'value' }).count({ open_count: '*' }).groupBy('account_id').as('opp'),
      'opp.account_id',
      'crm_accounts.id'
    )
    .select('crm_accounts.id', 'crm_accounts.name', 'crm_accounts.account_tier', 'crm_accounts.relationship_health_score', db.raw('coalesce(opp.open_value, 0) as open_value'), db.raw('coalesce(opp.open_count, 0) as open_count'))
    .orderBy('open_value', 'desc')
    .limit(Number(limit) || 10);

  return rows.map((r) => ({ ...r, open_value: Number(r.open_value), open_count: Number(r.open_count) }));
}

export async function stalePipeline(owner, { staleDays = 30 } = {}) {
  const days = Number(staleDays) || 30;
  const rows = await ownerScope(db('crm_opportunities'), owner)
    .whereNull('closed_at')
    .andWhere('updated_at', '<', db.raw(`now() - interval '${days} days'`))
    .orderBy('updated_at', 'asc');

  return rows.map((r) => ({ ...r, staleDays: Math.floor((Date.now() - new Date(r.updated_at).getTime()) / 86400000) }));
}
