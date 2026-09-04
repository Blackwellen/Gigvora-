import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { resolveRecruiterCompanyId } from '../../common/utils/resolveRecruiterCompany.js';

function toConnection(row) {
  let status = 'not_connected';
  let health = 'down';
  if (row.status === 'healthy') {
    status = 'connected';
    health = 'healthy';
  } else if (row.status === 'degraded') {
    status = 'connected';
    health = 'degraded';
  } else if (row.status === 'pending') {
    status = 'pending';
    health = 'down';
  } else if (row.status === 'disconnected') {
    status = 'not_connected';
    health = 'down';
  }
  return {
    id: row.id,
    provider: row.provider,
    status,
    health,
    external_account_name: row.external_account_name,
    sync_frequency_minutes: row.sync_frequency_minutes,
    connected_at: row.status === 'disconnected' || row.status === 'pending' ? null : row.created_at,
    last_sync_at: row.last_synced_at,
  };
}

function toFieldMapping(row) {
  return {
    id: row.id,
    connection_id: row.connection_id,
    source_field: row.local_field,
    target_field: row.remote_field,
    entity_type: row.entity_type,
    is_required: false,
  };
}

const ACTION_TO_LEVEL = { created: 'info', updated: 'info', skipped: 'warning', failed: 'error' };

function toSyncEvent(row) {
  return {
    id: row.id,
    sync_run_id: row.sync_run_id,
    level: ACTION_TO_LEVEL[row.action] || 'info',
    message: row.message || `${row.action} ${row.entity_type}${row.entity_external_id ? ` (${row.entity_external_id})` : ''}`,
    created_at: row.created_at,
  };
}

const RUN_STATUS_MAP = { completed: 'success', partial: 'partial', failed: 'failed', running: 'running' };

function toSyncRun(row, events) {
  return {
    id: row.id,
    connection_id: row.connection_id,
    status: RUN_STATUS_MAP[row.status] || row.status,
    records_synced: row.records_synced,
    records_failed: row.records_failed,
    error_summary: row.error_summary,
    started_at: row.started_at,
    finished_at: row.finished_at,
    events: events ? events.map(toSyncEvent) : undefined,
  };
}

async function assertOwnedConnection(companyId, id) {
  const conn = await db('ats_connections').where({ id, company_id: companyId }).first();
  if (!conn) throw new AppError('Connection not found', 404);
  return conn;
}

export async function listConnections(userId) {
  const companyId = await resolveRecruiterCompanyId(userId);
  const rows = await db('ats_connections').where({ company_id: companyId }).orderBy('created_at', 'asc');
  return rows.map(toConnection);
}

const PROVIDERS = ['greenhouse', 'lever', 'workday', 'bamboohr', 'icims'];

export async function createConnection(userId, { provider, external_account_name } = {}) {
  const companyId = await resolveRecruiterCompanyId(userId);
  if (!PROVIDERS.includes(provider)) throw new AppError('Invalid provider', 422);
  const existing = await db('ats_connections').where({ company_id: companyId, provider }).first();
  if (existing) throw new AppError('This provider is already connected', 422);
  const [row] = await db('ats_connections')
    .insert({
      company_id: companyId,
      provider,
      status: 'pending',
      external_account_name: external_account_name || null,
      created_by_user_id: userId,
    })
    .returning('*');
  return toConnection(row);
}

export async function disconnect(userId, connectionId) {
  const companyId = await resolveRecruiterCompanyId(userId);
  await assertOwnedConnection(companyId, connectionId);
  const [row] = await db('ats_connections')
    .where({ id: connectionId })
    .update({ status: 'disconnected', updated_at: db.fn.now() })
    .returning('*');
  return toConnection(row);
}

export async function listFieldMappings(userId, connectionId) {
  const companyId = await resolveRecruiterCompanyId(userId);
  await assertOwnedConnection(companyId, connectionId);
  const rows = await db('ats_field_mappings').where({ connection_id: connectionId }).orderBy('entity_type', 'asc');
  return rows.map(toFieldMapping);
}

export async function updateFieldMapping(userId, connectionId, id, { target_field } = {}) {
  const companyId = await resolveRecruiterCompanyId(userId);
  await assertOwnedConnection(companyId, connectionId);
  if (!target_field?.trim()) throw new AppError('target_field is required', 422);
  const [row] = await db('ats_field_mappings')
    .where({ id, connection_id: connectionId })
    .update({ remote_field: target_field.trim(), updated_at: db.fn.now() })
    .returning('*');
  if (!row) throw new AppError('Field mapping not found', 404);
  return toFieldMapping(row);
}

export async function listSyncRuns(userId, connectionId) {
  const companyId = await resolveRecruiterCompanyId(userId);
  await assertOwnedConnection(companyId, connectionId);
  const runs = await db('ats_sync_runs').where({ connection_id: connectionId }).orderBy('started_at', 'desc').limit(25);
  const runIds = runs.map((r) => r.id);
  const events = runIds.length ? await db('ats_sync_events').whereIn('sync_run_id', runIds).orderBy('created_at', 'asc') : [];
  return runs.map((run) => toSyncRun(run, events.filter((e) => e.sync_run_id === run.id)));
}

export async function triggerSync(userId, connectionId) {
  const companyId = await resolveRecruiterCompanyId(userId);
  const connection = await assertOwnedConnection(companyId, connectionId);

  const [run] = await db('ats_sync_runs')
    .insert({
      connection_id: connectionId,
      status: 'completed',
      started_at: db.fn.now(),
      finished_at: db.fn.now(),
      records_synced: 0,
      records_failed: 0,
    })
    .returning('*');

  await db('ats_connections').where({ id: connectionId }).update({ last_synced_at: db.fn.now(), updated_at: db.fn.now() });

  return toSyncRun(run, []);
}
