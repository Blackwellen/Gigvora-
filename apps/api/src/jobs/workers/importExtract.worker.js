import { Worker } from 'bullmq';
import { config } from '../../config/index.js';
import { db } from '../../db/connection.js';
import { extractCvFields } from '../../common/ml/importIntelligenceClient.js';
import { buildCvExtractionRequest, validateCvExtractionResponse } from '../../common/ml/extractionPrompt.js';
import { importDedupeQueue } from '../queues/index.js';
import { publishImportEvent } from '../../common/events/importEvents.js';

const connection = { url: config.redis.url };

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;

const SKILL_KEYWORDS = [
  'javascript', 'typescript', 'python', 'java', 'react', 'node.js', 'sql', 'aws', 'docker', 'kubernetes',
  'project management', 'communication', 'leadership', 'sales', 'marketing', 'design', 'figma', 'excel',
  'salesforce', 'c++', 'c#', 'go', 'ruby', 'php', 'swift', 'kotlin', 'data analysis', 'machine learning',
];

/**
 * Deterministic fallback extraction — used whenever the ML client returns
 * null (unavailable, timed out, or its response fails schema validation).
 * Never blocks onboarding: a CV import always produces at least this much.
 */
function deterministicExtract(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const email = text.match(EMAIL_REGEX)?.[0] || null;
  const phone = text.match(PHONE_REGEX)?.[0] || null;
  const name = lines[0]?.length && lines[0].length <= 80 ? lines[0] : null;
  const headline = lines[1]?.length && lines[1].length <= 120 ? lines[1] : null;

  const lowerText = text.toLowerCase();
  const skills = SKILL_KEYWORDS.filter((skill) => lowerText.includes(skill)).map((value) => ({ value, confidence: 0.5 }));

  return {
    name: name ? { value: name, confidence: 0.3 } : null,
    headline: headline ? { value: headline, confidence: 0.2 } : null,
    summary: null,
    email: email ? { value: email, confidence: 0.9 } : null,
    phone: phone ? { value: phone, confidence: 0.7 } : null,
    location: null,
    experience: [],
    education: [],
    skills,
    certifications: [],
    projects: [],
    languages: [],
    links: [],
  };
}

export const importExtractWorker = new Worker(
  'import-extract',
  async (job) => {
    const { importFileId, importId } = job.data;

    const fileRow = await db('import_files').where({ id: importFileId }).first();
    if (!fileRow) return;

    const importRow = await db('imports').where({ id: importId }).first();
    if (!importRow) return;
    const owner = { ownerUserId: importRow.owner_type === 'user' ? importRow.owner_id : null, workspaceId: importRow.workspace_id };

    const rows = await db('import_rows').where({ import_file_id: importFileId, status: 'pending' });
    let usedModelVersion = 'rule-based-v1';

    for (const row of rows) {
      const text = row.raw_json?.text || '';

      let normalized = null;
      let modelName = 'cv_entity_extractor';
      let modelVersion = 'rule-based-v1';

      if (text.trim()) {
        const request = buildCvExtractionRequest({ documentText: text, importFileId, sourceFilename: fileRow.original_filename });
        const mlResponse = await extractCvFields(request);
        const validated = mlResponse ? validateCvExtractionResponse(mlResponse) : null;
        if (validated) {
          normalized = validated;
          modelVersion = 'ml-v1';
        }
      }

      if (!normalized) {
        normalized = deterministicExtract(text);
      }

      await db('import_rows')
        .where({ id: row.id })
        .update({ normalized_json: JSON.stringify(normalized), status: 'mapped', updated_at: db.fn.now() });

      usedModelVersion = modelVersion;
    }

    if (rows.length) {
      const existingMapping = await db('import_field_mappings').where({ import_file_id: importFileId, source_column: 'document_text' }).first();
      if (!existingMapping) {
        await db('import_field_mappings').insert({
          import_id: importId,
          import_file_id: importFileId,
          source_column: 'document_text',
          target_field: 'cv_extraction',
          confidence: 1,
          model_name: 'cv_entity_extractor',
          model_version: usedModelVersion,
          is_manual_override: false,
        });
      }
    }

    publishImportEvent({ importId, importFileId, ...owner, type: 'file:extracted', payload: { rowCount: rows.length } });

    await importDedupeQueue.add('dedupe', { importFileId, importId }, { jobId: `dedupe-${importFileId}` });
  },
  { connection, concurrency: 4 }
);

importExtractWorker.on('failed', (job, err) => {
  // eslint-disable-next-line no-console
  console.error(`[worker] import-extract job ${job?.id} failed`, err.message);
});
