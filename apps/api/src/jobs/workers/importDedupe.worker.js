import { Worker } from 'bullmq';
import { config } from '../../config/index.js';
import { db } from '../../db/connection.js';
import { normalizeEmail, normalizePhone, normalizeDomain } from '../../common/utils/normalize.js';
import { scoreDedupeCandidate } from '../../common/ml/importIntelligenceClient.js';
import { publishImportEvent } from '../../common/events/importEvents.js';

const connection = { url: config.redis.url };

const ENTITY_TYPE_BY_IMPORT_TYPE = { contacts: 'contact', company: 'company', cv: 'profile', profile: 'profile' };

/**
 * Fetches the existing canonical entity's current field values in the
 * generic {email, phone, first_name, last_name, name, company_name,
 * website/domain, location} vocabulary apps/ml-service's dedupe scorer
 * reads (see import_intelligence_service.py _entity_name/_entity_domain).
 */
async function fetchExistingEntitySnapshot(entityType, entityId) {
  if (entityType === 'contact') {
    const row = await db('contacts').where({ id: entityId }).first();
    if (!row) return {};
    return {
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email_normalized,
      phone: row.phone_normalized,
      company_name: row.company_name,
      location: row.location,
    };
  }
  if (entityType === 'company') {
    const row = await db('companies').where({ id: entityId }).first();
    if (!row) return {};
    return { name: row.name, website: row.website, industry: row.industry };
  }
  if (entityType === 'profile') {
    const row = await db('profiles')
      .join('users', 'users.id', 'profiles.user_id')
      .where('profiles.id', entityId)
      .select('users.first_name', 'users.last_name', 'users.email', 'profiles.location')
      .first();
    if (!row) return {};
    return { first_name: row.first_name, last_name: row.last_name, email: row.email, location: row.location };
  }
  return {};
}

/**
 * Builds the "candidate" snapshot (the imported row) in the same vocabulary,
 * from import_rows.normalized_json — which is already keyed by the target
 * allowlist field names (importFieldAllowlist.js), a superset/match of what
 * ml-service reads for each entity type.
 */
function buildCandidateSnapshot(entityType, normalized) {
  if (entityType === 'contact') {
    return {
      first_name: normalized.first_name,
      last_name: normalized.last_name,
      email: normalized.email,
      phone: normalized.phone,
      company_name: normalized.company_name,
      location: normalized.location,
    };
  }
  if (entityType === 'company') {
    return { name: normalized.name, website: normalized.website, domain: normalized.domain, industry: normalized.industry };
  }
  // profile/cv
  return { name: normalized.name, email: normalized.email, phone: normalized.phone, location: normalized.location };
}

/**
 * Normalized exact-match dedupe rules — the deterministic first pass run
 * for every row regardless of ML availability (Domain 04 §59/§60). Returns
 * an array of { entityId, entityType, score, reasonCodes }.
 */
async function findExactMatchCandidates({ importType, ownerType, ownerId, normalized }) {
  const entityType = ENTITY_TYPE_BY_IMPORT_TYPE[importType];
  const email = normalizeEmail(normalized.email);
  const phone = normalizePhone(normalized.phone);
  const candidates = [];

  if (entityType === 'contact') {
    if (email) {
      const rows = await db('contacts').where({ owner_type: ownerType, owner_id: ownerId, email_normalized: email });
      for (const r of rows) candidates.push({ entityId: r.id, score: 0.95, reasonCodes: ['email_exact_match'] });
    }
    if (phone) {
      const rows = await db('contacts').where({ owner_type: ownerType, owner_id: ownerId, phone_normalized: phone });
      for (const r of rows) {
        if (!candidates.some((c) => c.entityId === r.id)) candidates.push({ entityId: r.id, score: 0.8, reasonCodes: ['phone_exact_match'] });
      }
    }
  } else if (entityType === 'company') {
    const domain = normalizeDomain(normalized.website || normalized.domain);
    if (normalized.name) {
      const rows = await db('companies').whereRaw('lower(name) = ?', [String(normalized.name).toLowerCase()]);
      for (const r of rows) candidates.push({ entityId: r.id, score: 0.7, reasonCodes: ['name_exact_match'] });
    }
    if (domain) {
      const rows = await db('companies').whereRaw('lower(website) LIKE ?', [`%${domain}%`]);
      for (const r of rows) {
        if (!candidates.some((c) => c.entityId === r.id)) candidates.push({ entityId: r.id, score: 0.9, reasonCodes: ['domain_exact_match'] });
        else {
          const existing = candidates.find((c) => c.entityId === r.id);
          existing.score = Math.max(existing.score, 0.9);
          existing.reasonCodes.push('domain_exact_match');
        }
      }
    }
  } else if (entityType === 'profile') {
    if (email) {
      const rows = await db('users').where({ email });
      for (const u of rows) {
        const profile = await db('profiles').where({ user_id: u.id }).first();
        if (profile) candidates.push({ entityId: profile.id, score: 0.9, reasonCodes: ['email_exact_match'] });
      }
    }
  }

  return candidates.map((c) => ({ ...c, entityType }));
}

export const importDedupeWorker = new Worker(
  'import-dedupe',
  async (job) => {
    const { importFileId, importId } = job.data;

    const fileRow = await db('import_files').where({ id: importFileId }).first();
    if (!fileRow) return;

    const importRow = await db('imports').where({ id: importId }).first();
    if (!importRow) return;
    const owner = { ownerUserId: importRow.owner_type === 'user' ? importRow.owner_id : null, workspaceId: importRow.workspace_id };

    const rows = await db('import_rows').where({ import_file_id: importFileId, status: 'mapped' });

    for (const row of rows) {
      const existingMatches = await db('import_dedupe_matches').where({ import_row_id: row.id }).first();
      if (existingMatches) continue; // idempotent — already computed for this row

      const normalized = row.normalized_json || {};
      const candidates = await findExactMatchCandidates({
        importType: importRow.import_type,
        ownerType: importRow.owner_type,
        ownerId: importRow.owner_id,
        normalized,
      });

      // Optional ML re-scoring on top of the rule-based candidates — never
      // required, never blocks: if it fails/times out we keep the rule score.
      for (const candidate of candidates) {
        const existingSnapshot = await fetchExistingEntitySnapshot(candidate.entityType, candidate.entityId);
        const candidateSnapshot = buildCandidateSnapshot(candidate.entityType, normalized);
        const mlScore = await scoreDedupeCandidate({
          entity_type: candidate.entityType,
          candidate: candidateSnapshot,
          existing: existingSnapshot,
        }).catch(() => null);

        const mlProbability = typeof mlScore?.match_probability === 'number' ? mlScore.match_probability : null;

        await db('import_dedupe_matches').insert({
          import_id: importId,
          import_row_id: row.id,
          candidate_entity_type: candidate.entityType,
          candidate_entity_id: candidate.entityId,
          match_score: mlProbability ?? candidate.score,
          match_reason_codes: JSON.stringify(mlProbability != null ? mlScore.reason_codes : candidate.reasonCodes),
          decision: 'pending',
          model_name: mlProbability != null ? `${candidate.entityType}_dedupe` : null,
          model_version: mlProbability != null ? 'ml-v1' : 'rule-based-v1',
        });
      }

      const newStatus = candidates.length ? 'needs_review' : 'validated';
      await db('import_rows').where({ id: row.id }).update({ status: newStatus, updated_at: db.fn.now() });
    }

    publishImportEvent({ importId, importFileId, ...owner, type: 'file:deduped', payload: { rowCount: rows.length } });

    const remainingPending = await db('import_rows').where({ import_id: importId }).whereIn('status', ['pending']).count('id as count').first();
    if (Number(remainingPending.count) === 0) {
      await db('imports').where({ id: importId }).update({ status: 'validating', updated_at: db.fn.now() });
    }
  },
  { connection, concurrency: 4 }
);

importDedupeWorker.on('failed', (job, err) => {
  // eslint-disable-next-line no-console
  console.error(`[worker] import-dedupe job ${job?.id} failed`, err.message);
});
