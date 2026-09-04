import { db, ownerScope, paginationParams, logActivity, notifyUser } from './shared.js';
import { AppError } from '../../common/errors/AppError.js';
import { emitEvent } from '../../common/events/outbox.js';
import { normalizeEmail, normalizePhone } from '../../common/utils/normalize.js';

const JOBS_TABLE = 'crm_import_jobs';
const ROWS_TABLE = 'crm_import_rows';

export async function create(owner, actorId, data = {}) {
  const { source = 'csv', fileName, objectKey, fileSizeBytes, fieldMappingJsonb = {}, ownershipDefaultsJsonb = {} } = data;

  const [record] = await db(JOBS_TABLE)
    .insert({
      owner_type: owner.ownerType,
      owner_id: owner.ownerId,
      workspace_id: owner.workspaceId ?? null,
      created_by: actorId,
      source,
      file_name: fileName ?? null,
      object_key: objectKey ?? null,
      file_size_bytes: fileSizeBytes ?? null,
      field_mapping_jsonb: JSON.stringify(fieldMappingJsonb ?? {}),
      ownership_defaults_jsonb: JSON.stringify(ownershipDefaultsJsonb ?? {}),
      status: 'uploaded',
    })
    .returning('*');

  return record;
}

export async function getById(owner, id) {
  const record = await ownerScope(db(JOBS_TABLE), owner).where({ id }).first();
  if (!record) throw new AppError('Import job not found', 404);
  return record;
}

export async function addRows(owner, id, rows = []) {
  if (!Array.isArray(rows) || !rows.length) throw new AppError('rows array is required', 400);

  return db.transaction(async (trx) => {
    const job = await ownerScope(trx(JOBS_TABLE), owner).where({ id }).first();
    if (!job) throw new AppError('Import job not found', 404);

    const startNumber = job.total_rows;
    const insertRows = rows.map((raw, index) => ({
      import_job_id: id,
      row_number: startNumber + index + 1,
      raw_jsonb: JSON.stringify(raw ?? {}),
      status: 'pending',
    }));

    const inserted = await trx(ROWS_TABLE).insert(insertRows).returning('*');
    await trx(JOBS_TABLE).where({ id }).update({ total_rows: startNumber + inserted.length, updated_at: trx.fn.now() });

    return inserted;
  });
}

export async function listRows(owner, id, filters = {}) {
  const { limit, offset } = paginationParams(filters);
  await getById(owner, id);

  const build = () => {
    const qb = db(ROWS_TABLE).where({ import_job_id: id });
    if (filters.status) qb.andWhere({ status: filters.status });
    return qb;
  };

  const [rows, [{ count }]] = await Promise.all([
    build().orderBy('row_number', 'asc').limit(limit).offset(offset),
    build().count({ count: '*' }),
  ]);

  return { data: rows, total: Number(count) };
}

async function findExistingContact(trx, owner, { email, phone, firstName, lastName }) {
  const emailNorm = normalizeEmail(email);
  const phoneNorm = normalizePhone(phone);
  if (!emailNorm && !phoneNorm && !(firstName && lastName)) return null;

  const qb = ownerScope(trx('crm_contacts'), owner).whereNull('archived_at');
  qb.andWhere((inner) => {
    let any = false;
    if (emailNorm) {
      inner.orWhere('email_normalized', emailNorm);
      any = true;
    }
    if (phoneNorm) {
      inner.orWhere('phone_normalized', phoneNorm);
      any = true;
    }
    if (!any && firstName && lastName) {
      inner.orWhere((deep) => deep.whereRaw('lower(first_name) = ?', [firstName.toLowerCase()]).andWhereRaw('lower(last_name) = ?', [lastName.toLowerCase()]));
    }
  });
  return qb.first();
}

/**
 * process — one-shot synchronous processing loop (no background worker in
 * this environment). Each row: dedupe-match against existing crm_contacts;
 * link to the match (status='matched') or create a new contact
 * (status='created'); malformed rows are marked 'failed' without aborting
 * the batch.
 */
export async function process(owner, actorId, id) {
  return db.transaction(async (trx) => {
    const job = await ownerScope(trx(JOBS_TABLE), owner).where({ id }).first();
    if (!job) throw new AppError('Import job not found', 404);
    if (job.status === 'completed') throw new AppError('Import job has already been processed', 400);

    await trx(JOBS_TABLE).where({ id }).update({ status: 'processing', updated_at: trx.fn.now() });

    const rows = await trx(ROWS_TABLE).where({ import_job_id: id, status: 'pending' }).orderBy('row_number', 'asc');
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    let duplicate = 0;

    for (const row of rows) {
      const raw = typeof row.raw_jsonb === 'string' ? JSON.parse(row.raw_jsonb) : row.raw_jsonb || {};
      try {
        const firstName = raw.firstName || raw.first_name || null;
        const lastName = raw.lastName || raw.last_name || null;
        const email = raw.email || null;
        const phone = raw.phone || null;

        if (!firstName && !lastName && !raw.displayName && !email) {
          await trx(ROWS_TABLE).where({ id: row.id }).update({ status: 'skipped', error_message: 'No identifying fields present', updated_at: trx.fn.now() });
          skipped += 1;
          continue;
        }

        const match = await findExistingContact(trx, owner, { email, phone, firstName, lastName });
        if (match) {
          await trx(ROWS_TABLE).where({ id: row.id }).update({ status: 'matched', match_type: 'existing_contact', created_record_id: match.id, updated_at: trx.fn.now() });
          duplicate += 1;
          continue;
        }

        const emailNorm = normalizeEmail(email);
        const phoneNorm = normalizePhone(phone);
        const [contact] = await trx('crm_contacts')
          .insert({
            owner_type: owner.ownerType,
            owner_id: owner.ownerId,
            workspace_id: owner.workspaceId ?? null,
            first_name: firstName,
            last_name: lastName,
            display_name: raw.displayName || [firstName, lastName].filter(Boolean).join(' ') || null,
            job_title: raw.jobTitle || raw.job_title || null,
            emails_jsonb: JSON.stringify(emailNorm ? [{ value: emailNorm, primary: true }] : []),
            email_normalized: emailNorm,
            phones_jsonb: JSON.stringify(phoneNorm ? [{ value: phoneNorm, primary: true }] : []),
            phone_normalized: phoneNorm,
            lifecycle_stage: 'lead',
            owner_user_id: job.created_by,
            source: 'import',
            tags: JSON.stringify(raw.tags ?? []),
          })
          .returning('*');

        await logActivity(trx, owner, { objectType: 'contact', objectId: contact.id, actorId, activityType: 'system_event', summary: 'Contact created via import', metadataJsonb: { importJobId: id, rowNumber: row.row_number } });
        await trx(ROWS_TABLE).where({ id: row.id }).update({ status: 'created', match_type: 'new', created_record_id: contact.id, updated_at: trx.fn.now() });
        created += 1;
      } catch (err) {
        await trx(ROWS_TABLE).where({ id: row.id }).update({ status: 'failed', error_message: String(err?.message || err), updated_at: trx.fn.now() });
        failed += 1;
      }
    }

    const [record] = await trx(JOBS_TABLE)
      .where({ id })
      .update({
        status: 'completed',
        created_count: job.created_count + created,
        updated_count: job.updated_count + updated,
        skipped_count: job.skipped_count + skipped,
        failed_count: job.failed_count + failed,
        duplicate_count: job.duplicate_count + duplicate,
        completed_at: trx.fn.now(),
        updated_at: trx.fn.now(),
      })
      .returning('*');

    await emitEvent({ aggregateType: 'import_job', aggregateId: id, eventType: 'crm.import.completed', payload: { created, updated, skipped, failed, duplicate } }, trx);
    await notifyUser(trx, job.created_by, 'crm.import.completed', { importJobId: id, created, updated, skipped, failed, duplicate });

    return record;
  });
}
