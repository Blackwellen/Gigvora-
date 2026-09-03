import { Worker } from 'bullmq';
import { config } from '../../config/index.js';
import { db } from '../../db/connection.js';
import { suggestFieldMappings } from '../../common/ml/importIntelligenceClient.js';
import { suggestTargetFieldForHeader, isValidTargetField } from '../../modules/imports/importFieldAllowlist.js';
import { normalizeRowsForFile } from '../../modules/imports/normalizeRows.js';
import { importDedupeQueue } from '../queues/index.js';
import { publishImportEvent } from '../../common/events/importEvents.js';

const connection = { url: config.redis.url };
const AUTO_ACCEPT_CONFIDENCE = 0.8;
const SAMPLE_VALUES_PER_HEADER = 5;
const SAMPLE_ROWS_TO_SCAN = 25;

// apps/ml-service only knows two target schemas, whose field vocab matches
// Node's `contacts` allowlist exactly but differs from the `company`
// allowlist (company_name/company_size vs name/size) — map both directions
// so a suggestion round-trips through isValidTargetField correctly. cv/
// profile import types have no ml-service mapping schema; skip ML for them.
const TARGET_SCHEMA_BY_IMPORT_TYPE = { contacts: 'contact_import', company: 'company_import' };
const ML_TO_NODE_FIELD = { company: { company_name: 'name', company_size: 'size' } };

function translateMlTargetField(importType, mlTargetField) {
  if (!mlTargetField) return null;
  return ML_TO_NODE_FIELD[importType]?.[mlTargetField] || mlTargetField;
}

export const importMapWorker = new Worker(
  'import-map',
  async (job) => {
    const { importFileId, importId } = job.data;

    const fileRow = await db('import_files').where({ id: importFileId }).first();
    if (!fileRow) return;

    const importRow = await db('imports').where({ id: importId }).first();
    if (!importRow) return;
    const owner = { ownerUserId: importRow.owner_type === 'user' ? importRow.owner_id : null, workspaceId: importRow.workspace_id };

    const mappings = await db('import_field_mappings').where({ import_file_id: importFileId }).whereNull('target_field');

    if (mappings.length) {
      const targetSchema = TARGET_SCHEMA_BY_IMPORT_TYPE[importRow.import_type];
      let mlByColumn = new Map();

      if (targetSchema) {
        const sourceColumns = mappings.map((m) => m.source_column);
        const sampleRows = await db('import_rows')
          .where({ import_file_id: importFileId })
          .limit(SAMPLE_ROWS_TO_SCAN);
        const headers = sourceColumns.map((source_header) => ({
          source_header,
          sample_values: sampleRows
            .map((r) => r.raw_json?.[source_header])
            .filter((v) => v !== undefined && v !== null && String(v).trim() !== '')
            .slice(0, SAMPLE_VALUES_PER_HEADER)
            .map(String),
        }));
        const mlResult = await suggestFieldMappings({ target_schema: targetSchema, headers }).catch(() => null);
        mlByColumn = new Map((mlResult?.mappings || []).map((m) => [m.source_header, m]));
      }

      for (const mapping of mappings) {
        const mlSuggestion = mlByColumn.get(mapping.source_column);
        const mlTargetField = translateMlTargetField(importRow.import_type, mlSuggestion?.target_field);
        let targetField = null;
        let confidence = 0;
        let modelName = 'import_field_mapper';
        let modelVersion = 'rule-based-v1';

        if (mlSuggestion && isValidTargetField(mlTargetField, importRow.import_type)) {
          targetField = mlTargetField;
          confidence = mlSuggestion.confidence ?? 0.7;
          modelVersion = 'ml-v1';
        } else {
          const ruleSuggestion = suggestTargetFieldForHeader(mapping.source_column, importRow.import_type);
          targetField = ruleSuggestion.targetField;
          confidence = ruleSuggestion.confidence;
        }

        await db('import_field_mappings')
          .where({ id: mapping.id })
          .update({
            target_field: confidence >= AUTO_ACCEPT_CONFIDENCE ? targetField : targetField, // suggested either way; user reviews via PATCH
            confidence,
            model_name: modelName,
            model_version: modelVersion,
            updated_at: db.fn.now(),
          });
      }
    }

    await normalizeRowsForFile(importFileId);

    await db('imports').where({ id: importId }).update({ status: 'mapping', updated_at: db.fn.now() });
    publishImportEvent({ importId, importFileId, ...owner, type: 'file:mapped', payload: {} });

    await importDedupeQueue.add('dedupe', { importFileId, importId }, { jobId: `dedupe-${importFileId}` });
  },
  { connection, concurrency: 4 }
);

importMapWorker.on('failed', (job, err) => {
  // eslint-disable-next-line no-console
  console.error(`[worker] import-map job ${job?.id} failed`, err.message);
});
