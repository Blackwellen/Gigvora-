import { Worker } from 'bullmq';
import { config } from '../../config/index.js';
import { db } from '../../db/connection.js';
import { normalizeEmail, normalizePhone } from '../../common/utils/normalize.js';
import { publishImportEvent } from '../../common/events/importEvents.js';

const connection = { url: config.redis.url };
const CHUNK_SIZE = 200;

function slugify(name) {
  return String(name || 'company')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) || 'company';
}

async function uniqueSlug(trx, base) {
  let slug = base;
  let attempt = 0;
  while (await trx('companies').where({ slug }).first()) {
    attempt += 1;
    slug = `${base}-${attempt}`;
  }
  return slug;
}

async function decisionForRow(trx, rowId) {
  const matches = await trx('import_dedupe_matches').where({ import_row_id: rowId });
  if (!matches.length) return { decision: 'create_new', match: null };
  // A row may have multiple candidate matches; the first non-pending, non-ignore
  // decision drives commit behaviour. If any remain 'pending' the row should
  // never have reached ready_to_commit (validateImport enforces this).
  const acted = matches.find((m) => m.decision !== 'pending' && m.decision !== 'ignore');
  if (acted) return { decision: acted.decision, match: acted };
  if (matches.every((m) => m.decision === 'ignore')) return { decision: 'ignore', match: matches[0] };
  return { decision: 'create_new', match: null };
}

async function commitContactRow(trx, importRow, row) {
  const { decision, match } = await decisionForRow(trx, row.id);
  if (decision === 'ignore') {
    await trx('import_rows').where({ id: row.id }).update({ status: 'skipped', updated_at: trx.fn.now() });
    return;
  }

  const normalized = row.normalized_json || {};
  const patch = {
    first_name: normalized.first_name ?? null,
    last_name: normalized.last_name ?? null,
    email_normalized: normalizeEmail(normalized.email),
    phone_normalized: normalizePhone(normalized.phone),
    company_name: normalized.company_name ?? null,
    title: normalized.title ?? null,
    location: normalized.location ?? null,
    tags: JSON.stringify(normalized.tags ?? []),
    source: 'import',
    import_id: importRow.id,
    import_row_id: row.id,
  };

  let entityId;
  if ((decision === 'merge' || decision === 'link') && match) {
    const merged = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== null && v !== undefined && v !== '[]'));
    merged.updated_at = trx.fn.now();
    const [updated] = await trx('contacts').where({ id: match.candidate_entity_id }).update(merged).returning('*');
    entityId = updated?.id || match.candidate_entity_id;
  } else {
    const [created] = await trx('contacts')
      .insert({ owner_type: importRow.owner_type, owner_id: importRow.owner_id, workspace_id: importRow.workspace_id, ...patch })
      .returning('*');
    entityId = created.id;
  }

  await trx('import_rows').where({ id: row.id }).update({ status: 'committed', committed_entity_type: 'contact', committed_entity_id: entityId, updated_at: trx.fn.now() });
}

async function commitCompanyRow(trx, importRow, row) {
  const { decision, match } = await decisionForRow(trx, row.id);
  if (decision === 'ignore') {
    await trx('import_rows').where({ id: row.id }).update({ status: 'skipped', updated_at: trx.fn.now() });
    return;
  }

  const normalized = row.normalized_json || {};
  const patch = {
    name: normalized.name ?? null,
    website: normalized.website ?? normalized.domain ?? null,
    industry: normalized.industry ?? null,
    size: normalized.size ?? null,
    description: normalized.description ?? null,
    logo_url: normalized.logo_url ?? null,
  };

  let entityId;
  if ((decision === 'merge' || decision === 'link') && match) {
    const merged = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== null && v !== undefined));
    merged.updated_at = trx.fn.now();
    const [updated] = await trx('companies').where({ id: match.candidate_entity_id }).update(merged).returning('*');
    entityId = updated?.id || match.candidate_entity_id;
  } else {
    const slug = await uniqueSlug(trx, slugify(patch.name));
    const [created] = await trx('companies')
      .insert({ owner_id: importRow.created_by, name: patch.name || 'Imported company', slug, ...patch })
      .returning('*');
    entityId = created.id;
    if (importRow.owner_type === 'company' && importRow.workspace_id) {
      await trx('company_members').insert({ company_id: entityId, user_id: importRow.created_by, role: 'admin', status: 'active' }).onConflict(['company_id', 'user_id']).ignore();
    }
  }

  await trx('import_rows').where({ id: row.id }).update({ status: 'committed', committed_entity_type: 'company', committed_entity_id: entityId, updated_at: trx.fn.now() });
}

async function commitProfileRow(trx, importRow, row) {
  const normalized = row.normalized_json || {};
  const userId = importRow.owner_type === 'user' ? importRow.owner_id : importRow.created_by;

  const existing = await trx('profiles').where({ user_id: userId }).first();
  const patch = {
    bio: normalized.summary?.value ?? normalized.summary ?? existing?.bio ?? null,
    location: normalized.location?.value ?? normalized.location ?? existing?.location ?? null,
    skills: JSON.stringify((normalized.skills || []).map((s) => (typeof s === 'string' ? s : s.value)).filter(Boolean)),
    experience: JSON.stringify(normalized.experience || existing?.experience || []),
    education: JSON.stringify(normalized.education || existing?.education || []),
  };

  let entityId;
  if (existing) {
    const [updated] = await trx('profiles').where({ id: existing.id }).update({ ...patch, updated_at: trx.fn.now() }).returning('*');
    entityId = updated.id;
  } else {
    const [created] = await trx('profiles').insert({ user_id: userId, ...patch }).returning('*');
    entityId = created.id;
  }

  await trx('import_rows').where({ id: row.id }).update({ status: 'committed', committed_entity_type: 'profile', committed_entity_id: entityId, updated_at: trx.fn.now() });
}

export const importCommitWorker = new Worker(
  'import-commit',
  async (job) => {
    const { importId } = job.data;

    const importRow = await db('imports').where({ id: importId }).first();
    if (!importRow) return;
    if (importRow.status === 'completed') return; // idempotent

    const owner = { ownerUserId: importRow.owner_type === 'user' ? importRow.owner_id : null, workspaceId: importRow.workspace_id };

    const allRowIds = await db('import_rows')
      .where({ import_id: importId })
      .whereNotIn('status', ['committed', 'skipped', 'failed'])
      .pluck('id');

    for (let i = 0; i < allRowIds.length; i += CHUNK_SIZE) {
      const chunkIds = allRowIds.slice(i, i + CHUNK_SIZE);
      await db.transaction(async (trx) => {
        const rows = await trx('import_rows').whereIn('id', chunkIds);
        for (const row of rows) {
          try {
            if (importRow.import_type === 'contacts') await commitContactRow(trx, importRow, row);
            else if (importRow.import_type === 'company') await commitCompanyRow(trx, importRow, row);
            else await commitProfileRow(trx, importRow, row);
          } catch (err) {
            await trx('import_rows').where({ id: row.id }).update({ status: 'failed', error_message: err.message, updated_at: trx.fn.now() });
          }
        }
      });
      publishImportEvent({ importId, ...owner, type: 'import:commit_progress', payload: { committed: Math.min(i + CHUNK_SIZE, allRowIds.length), total: allRowIds.length } });
    }

    const failedCount = await db('import_rows').where({ import_id: importId, status: 'failed' }).count('id as count').first();
    // Partial row-level failures are recorded per-row (import_rows.status = 'failed')
    // and surfaced via summary_json; the import itself is 'completed' once the
    // commit pass has processed every row — it never retries forever.
    await db('imports').where({ id: importId }).update({ status: 'completed', committed_at: db.fn.now(), updated_at: db.fn.now() });

    publishImportEvent({ importId, ...owner, type: 'import:completed', payload: { failedCount: Number(failedCount.count) } });
  },
  { connection, concurrency: 2 }
);

importCommitWorker.on('failed', async (job, err) => {
  // eslint-disable-next-line no-console
  console.error(`[worker] import-commit job ${job?.id} failed`, err.message);
  const importId = job?.data?.importId;
  if (importId && job.attemptsMade >= (job.opts.attempts || 1)) {
    await db('imports').where({ id: importId }).update({ status: 'failed', updated_at: db.fn.now() }).catch(() => {});
  }
});
