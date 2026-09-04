import { db, ownerScope, paginationParams, logActivity } from './shared.js';
import { AppError } from '../../common/errors/AppError.js';
import { emitEvent } from '../../common/events/outbox.js';
import { scoreOpportunityClose } from './ai.service.js';
import { ensureDefaultStages } from './pipeline-stages.service.js';

const TABLE = 'crm_opportunities';

const WRITABLE_FIELDS = {
  accountId: 'account_id',
  stageId: 'stage_id',
  ownerUserId: 'owner_user_id',
  name: 'name',
  value: 'value',
  currency: 'currency',
  probability: 'probability',
  forecastCategory: 'forecast_category',
  expectedCloseDate: 'expected_close_date',
  opportunityType: 'opportunity_type',
  source: 'source',
  productService: 'product_service',
  primaryContactId: 'primary_contact_id',
  championContactId: 'champion_contact_id',
  decisionMakerContactId: 'decision_maker_contact_id',
  economicBuyerContactId: 'economic_buyer_contact_id',
  nextStep: 'next_step',
  nextStepDueAt: 'next_step_due_at',
};

function buildPatch(data = {}) {
  const patch = {};
  for (const [key, column] of Object.entries(WRITABLE_FIELDS)) {
    if (data[key] !== undefined) patch[column] = data[key];
  }
  return patch;
}

async function applyCloseScore(trx, owner, opportunity) {
  const [stages, activityCountRow, stakeholderCountRow] = await Promise.all([
    ownerScope(trx('crm_pipeline_stages'), owner).orderBy('order_index', 'asc'),
    trx('crm_activities').where({ object_type: 'opportunity', object_id: opportunity.id }).andWhere('occurred_at', '>=', trx.raw("now() - interval '30 days'")).count({ count: '*' }),
    trx('crm_account_contact_roles').where({ account_id: opportunity.account_id }).count({ count: '*' }),
  ]);

  const currentStage = stages.find((s) => s.id === opportunity.stage_id);
  const stageOrderIndex = currentStage?.order_index ?? 0;
  const totalStages = stages.length || 1;
  const stageAgeDays = Math.max(0, Math.floor((Date.now() - new Date(opportunity.updated_at || opportunity.created_at).getTime()) / 86400000));

  const result = await scoreOpportunityClose(
    {
      stageOrderIndex,
      totalStages,
      stageAgeDays,
      activityCountLast30d: Number(activityCountRow[0]?.count || 0),
      stakeholderCount: Number(stakeholderCountRow[0]?.count || 0),
      value: Number(opportunity.value || 0),
    },
    { owner, objectId: opportunity.id, trx }
  );

  await trx(TABLE).where({ id: opportunity.id }).update({ ai_close_score: result.score, ai_close_confidence: result.confidence });
  return result;
}

export async function list(owner, filters = {}) {
  const { limit, offset } = paginationParams(filters);
  const { stageId, ownerUserId, accountId, forecastCategory, valueMin, valueMax, closeDateFrom, closeDateTo, search } = filters;

  const build = () => {
    const qb = ownerScope(db(TABLE), owner);
    if (stageId) qb.andWhere({ stage_id: stageId });
    if (ownerUserId) qb.andWhere({ owner_user_id: ownerUserId });
    if (accountId) qb.andWhere({ account_id: accountId });
    if (forecastCategory) qb.andWhere({ forecast_category: forecastCategory });
    if (valueMin) qb.andWhere('value', '>=', Number(valueMin));
    if (valueMax) qb.andWhere('value', '<=', Number(valueMax));
    if (closeDateFrom) qb.andWhere('expected_close_date', '>=', closeDateFrom);
    if (closeDateTo) qb.andWhere('expected_close_date', '<=', closeDateTo);
    if (search) qb.andWhereILike('name', `%${search}%`);
    return qb;
  };

  const [rows, [{ count }]] = await Promise.all([
    build().orderBy('updated_at', 'desc').limit(limit).offset(offset),
    build().count({ count: '*' }),
  ]);

  return { data: rows, total: Number(count) };
}

export async function getById(owner, id) {
  const record = await ownerScope(db(TABLE), owner).where({ id }).first();
  if (!record) throw new AppError('Opportunity not found', 404);

  const contactIds = [record.primary_contact_id, record.champion_contact_id, record.decision_maker_contact_id, record.economic_buyer_contact_id].filter(Boolean);
  const contacts = contactIds.length ? await db('crm_contacts').whereIn('id', contactIds) : [];
  const byId = new Map(contacts.map((c) => [c.id, c]));

  return {
    ...record,
    primaryContact: byId.get(record.primary_contact_id) || null,
    championContact: byId.get(record.champion_contact_id) || null,
    decisionMakerContact: byId.get(record.decision_maker_contact_id) || null,
    economicBuyerContact: byId.get(record.economic_buyer_contact_id) || null,
  };
}

export async function create(owner, actorId, data) {
  return db.transaction(async (trx) => {
    const patch = buildPatch(data);
    if (!patch.name) throw new AppError('name is required', 400);
    if (!patch.account_id) throw new AppError('accountId is required', 400);

    if (!patch.stage_id) {
      const stages = await ensureDefaultStages(trx, owner);
      patch.stage_id = stages[0].id;
    }

    const [record] = await trx(TABLE)
      .insert({
        owner_type: owner.ownerType,
        owner_id: owner.ownerId,
        workspace_id: owner.workspaceId ?? null,
        ...patch,
      })
      .returning('*');

    await logActivity(trx, owner, { objectType: 'opportunity', objectId: record.id, actorId, activityType: 'system_event', summary: 'Opportunity created' });
    await emitEvent({ aggregateType: 'opportunity', aggregateId: record.id, eventType: 'crm.opportunity.created', payload: { name: record.name } }, trx);
    await applyCloseScore(trx, owner, record);

    return trx(TABLE).where({ id: record.id }).first();
  });
}

export async function update(owner, actorId, id, data) {
  return db.transaction(async (trx) => {
    const existing = await ownerScope(trx(TABLE), owner).where({ id }).first();
    if (!existing) throw new AppError('Opportunity not found', 404);

    const patch = buildPatch(data);
    patch.updated_at = trx.fn.now();

    const [record] = await trx(TABLE).where({ id }).update(patch).returning('*');

    await logActivity(trx, owner, { objectType: 'opportunity', objectId: id, actorId, activityType: 'system_event', summary: 'Opportunity updated', metadataJsonb: { fields: Object.keys(patch) } });
    await emitEvent({ aggregateType: 'opportunity', aggregateId: id, eventType: 'crm.opportunity.updated', payload: { fields: Object.keys(patch) } }, trx);
    await applyCloseScore(trx, owner, record);

    return trx(TABLE).where({ id }).first();
  });
}

export async function remove(owner, actorId, id) {
  return db.transaction(async (trx) => {
    const count = await ownerScope(trx(TABLE), owner).where({ id }).del();
    if (!count) throw new AppError('Opportunity not found', 404);
    await emitEvent({ aggregateType: 'opportunity', aggregateId: id, eventType: 'crm.opportunity.deleted', payload: {} }, trx);
  });
}

export async function move(owner, actorId, id, { stageId, boardOrder } = {}) {
  if (!stageId) throw new AppError('stageId is required', 400);

  return db.transaction(async (trx) => {
    const opportunity = await ownerScope(trx(TABLE), owner).where({ id }).first();
    if (!opportunity) throw new AppError('Opportunity not found', 404);

    const toStage = await ownerScope(trx('crm_pipeline_stages'), owner).where({ id: stageId }).first();
    if (!toStage) throw new AppError('Pipeline stage not found', 404);

    const fromStageId = opportunity.stage_id;
    const patch = { stage_id: stageId, updated_at: trx.fn.now() };
    if (boardOrder !== undefined) patch.board_order = boardOrder;
    if (toStage.is_won || toStage.is_lost) {
      patch.closed_at = trx.fn.now();
      patch.actual_close_date = trx.raw('CURRENT_DATE');
    }

    const [record] = await trx(TABLE).where({ id }).update(patch).returning('*');

    await trx('crm_opportunity_stage_history').insert({
      opportunity_id: id,
      from_stage_id: fromStageId,
      to_stage_id: stageId,
      changed_by: actorId,
    });

    await logActivity(trx, owner, {
      objectType: 'opportunity',
      objectId: id,
      actorId,
      activityType: 'stage_change',
      summary: `Stage changed to ${toStage.label}`,
      metadataJsonb: { fromStageId, toStageId: stageId },
    });

    await emitEvent({ aggregateType: 'opportunity', aggregateId: id, eventType: 'crm.opportunity.stage_changed', payload: { fromStageId, toStageId: stageId } }, trx);

    if (toStage.is_won) {
      await emitEvent({ aggregateType: 'opportunity', aggregateId: id, eventType: 'crm.opportunity.won', payload: { stageId } }, trx);
    } else if (toStage.is_lost) {
      await emitEvent({ aggregateType: 'opportunity', aggregateId: id, eventType: 'crm.opportunity.lost', payload: { stageId } }, trx);
    }

    await applyCloseScore(trx, owner, record);

    return trx(TABLE).where({ id }).first();
  });
}

export async function close(owner, actorId, id, { outcome, reason } = {}) {
  if (!['won', 'lost'].includes(outcome)) throw new AppError("outcome must be 'won' or 'lost'", 400);

  return db.transaction(async (trx) => {
    const opportunity = await ownerScope(trx(TABLE), owner).where({ id }).first();
    if (!opportunity) throw new AppError('Opportunity not found', 404);

    let stage = await ownerScope(trx('crm_pipeline_stages'), owner).where(outcome === 'won' ? { is_won: true } : { is_lost: true }).first();
    if (!stage) {
      const stages = await ensureDefaultStages(trx, owner);
      stage = stages.find((s) => (outcome === 'won' ? s.is_won : s.is_lost));
    }

    const fromStageId = opportunity.stage_id;
    const patch = {
      stage_id: stage.id,
      closed_at: trx.fn.now(),
      actual_close_date: trx.raw('CURRENT_DATE'),
      updated_at: trx.fn.now(),
    };
    if (outcome === 'won') patch.win_reason = reason ?? null;
    else patch.loss_reason = reason ?? null;

    const [record] = await trx(TABLE).where({ id }).update(patch).returning('*');

    await trx('crm_opportunity_stage_history').insert({ opportunity_id: id, from_stage_id: fromStageId, to_stage_id: stage.id, changed_by: actorId, reason: reason ?? null });

    await logActivity(trx, owner, {
      objectType: 'opportunity',
      objectId: id,
      actorId,
      activityType: 'stage_change',
      summary: `Opportunity closed as ${outcome}`,
      metadataJsonb: { outcome, reason },
    });

    await emitEvent({ aggregateType: 'opportunity', aggregateId: id, eventType: 'crm.opportunity.stage_changed', payload: { fromStageId, toStageId: stage.id } }, trx);
    await emitEvent({ aggregateType: 'opportunity', aggregateId: id, eventType: `crm.opportunity.${outcome}`, payload: { reason } }, trx);

    return record;
  });
}
