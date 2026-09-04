import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { resolveRecruiterCompanyId } from '../../common/utils/resolveRecruiterCompany.js';

function toAlert(row) {
  return {
    id: row.id,
    severity: row.severity,
    title: row.title,
    description: row.description,
    source: row.alert_type,
    is_read: row.is_read,
    is_resolved: row.is_resolved,
    created_at: row.created_at,
  };
}

export async function list(userId, { severity, read } = {}) {
  const companyId = await resolveRecruiterCompanyId(userId);
  const qb = db('advanced_alerts').where({ company_id: companyId });
  if (severity) qb.andWhere({ severity });
  if (read !== undefined) qb.andWhere({ is_read: read === 'true' || read === true });
  const rows = await qb.orderBy('created_at', 'desc');
  return rows.map(toAlert);
}

async function assertOwnedAlert(companyId, id) {
  const alert = await db('advanced_alerts').where({ id, company_id: companyId }).first();
  if (!alert) throw new AppError('Alert not found', 404);
  return alert;
}

export async function update(userId, id, { is_read, is_resolved } = {}) {
  const companyId = await resolveRecruiterCompanyId(userId);
  await assertOwnedAlert(companyId, id);
  const patch = {};
  if (is_read !== undefined) patch.is_read = Boolean(is_read);
  if (is_resolved !== undefined) patch.is_resolved = Boolean(is_resolved);
  if (!Object.keys(patch).length) throw new AppError('Nothing to update', 422);
  patch.updated_at = db.fn.now();
  const [row] = await db('advanced_alerts').where({ id }).update(patch).returning('*');
  return toAlert(row);
}
