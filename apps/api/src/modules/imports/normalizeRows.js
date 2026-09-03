import { db } from '../../db/connection.js';

/**
 * Applies the current accepted field mappings for a file to every parsed
 * row's raw_json, producing normalized_json keyed by canonical target
 * fields. Shared by importMap.worker.js (first pass) and the mappings PATCH
 * endpoint (re-normalize after a manual override) so both paths stay
 * consistent.
 */
export async function normalizeRowsForFile(importFileId) {
  const mappings = await db('import_field_mappings').where({ import_file_id: importFileId }).whereNotNull('target_field');
  const rows = await db('import_rows').where({ import_file_id: importFileId });

  for (const row of rows) {
    const normalized = {};
    for (const mapping of mappings) {
      const value = row.raw_json?.[mapping.source_column];
      if (value !== undefined) normalized[mapping.target_field] = value;
    }
    await db('import_rows').where({ id: row.id }).update({ normalized_json: JSON.stringify(normalized), status: 'mapped', updated_at: db.fn.now() });
  }

  return rows.length;
}
