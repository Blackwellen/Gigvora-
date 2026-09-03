import { Worker } from 'bullmq';
import { parse as parseCsv } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { config } from '../../config/index.js';
import { db } from '../../db/connection.js';
import { getObjectBuffer } from '../../storage/s3.js';
import { parseVcf } from '../../modules/imports/parsers/vcfParser.js';
import { importExtractQueue, importMapQueue, importDedupeQueue } from '../queues/index.js';
import { publishImportEvent } from '../../common/events/importEvents.js';

const connection = { url: config.redis.url };

const PARSE_TIMEOUT_MS = 30000;
const MAX_ROWS = 5000;
const MAX_COLUMNS = 100;
const MAX_CELL_LENGTH = 5000;

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function clampCell(value) {
  if (value === null || value === undefined) return null;
  const str = String(value);
  return str.length > MAX_CELL_LENGTH ? str.slice(0, MAX_CELL_LENGTH) : str;
}

function tabularRecordsToRows(records) {
  if (!records.length) return { headers: [], rows: [] };
  const headers = Object.keys(records[0]).slice(0, MAX_COLUMNS);
  const rows = records.slice(0, MAX_ROWS).map((record) => {
    const out = {};
    for (const h of headers) out[h] = clampCell(record[h]);
    return out;
  });
  return { headers, rows };
}

async function parseCsvBuffer(buffer) {
  const records = parseCsv(buffer, { columns: true, skip_empty_lines: true, trim: true, bom: true });
  return tabularRecordsToRows(records);
}

async function parseXlsxBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellText: true, sheetRows: MAX_ROWS + 1 });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const records = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: false });
  return tabularRecordsToRows(records);
}

async function parsePdfBuffer(buffer) {
  const { default: pdfParse } = await import('pdf-parse');
  const result = await pdfParse(buffer);
  return { text: result.text };
}

async function parseDocxBuffer(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return { text: result.value };
}

function parseTxtBuffer(buffer) {
  return { text: buffer.toString('utf-8') };
}

export const importParseWorker = new Worker(
  'import-parse',
  async (job) => {
    const { importFileId, importId } = job.data;

    const fileRow = await db('import_files').where({ id: importFileId }).first();
    if (!fileRow) return;
    if (fileRow.parser_status === 'parsed') return; // idempotent
    if (fileRow.upload_status !== 'ready_for_parse') return; // never parse before sanitization completes

    const importRow = await db('imports').where({ id: importId }).first();
    if (!importRow) return;
    const owner = { ownerUserId: importRow.owner_type === 'user' ? importRow.owner_id : null, workspaceId: importRow.workspace_id };

    await db('import_files').where({ id: importFileId }).update({ parser_status: 'parsing', upload_status: 'parsing', updated_at: db.fn.now() });

    const key = fileRow.sanitized_storage_key || fileRow.storage_key; // only the sanitized derivative is ever parsed once one exists
    const buffer = await getObjectBuffer(key);
    const mime = fileRow.mime_type_detected || '';
    const ext = (fileRow.original_filename.split('.').pop() || '').toLowerCase();

    try {
      if (mime === 'application/pdf') {
        const { text } = await withTimeout(parsePdfBuffer(buffer), PARSE_TIMEOUT_MS, 'PDF parse');
        await db('import_rows').insert({ import_id: importId, import_file_id: importFileId, row_number: 1, raw_json: JSON.stringify({ text }), status: 'pending' });
        await finishParse(importFileId, importId, importRow, owner, 'extract');
      } else if (mime.includes('wordprocessingml') || ext === 'docx') {
        const { text } = await withTimeout(parseDocxBuffer(buffer), PARSE_TIMEOUT_MS, 'DOCX parse');
        await db('import_rows').insert({ import_id: importId, import_file_id: importFileId, row_number: 1, raw_json: JSON.stringify({ text }), status: 'pending' });
        await finishParse(importFileId, importId, importRow, owner, 'extract');
      } else if (ext === 'txt') {
        const { text } = parseTxtBuffer(buffer);
        await db('import_rows').insert({ import_id: importId, import_file_id: importFileId, row_number: 1, raw_json: JSON.stringify({ text }), status: 'pending' });
        await finishParse(importFileId, importId, importRow, owner, 'extract');
      } else if (ext === 'vcf') {
        const cards = parseVcf(buffer.toString('utf-8')).slice(0, MAX_ROWS);
        const rowsToInsert = cards.map((card, idx) => ({
          import_id: importId,
          import_file_id: importFileId,
          row_number: idx + 1,
          raw_json: JSON.stringify(card),
          normalized_json: JSON.stringify(card),
          status: 'mapped',
        }));
        if (rowsToInsert.length) await db('import_rows').insert(rowsToInsert);
        await finishParse(importFileId, importId, importRow, owner, 'dedupe');
      } else if (ext === 'csv' || mime === 'text/csv') {
        const { headers, rows } = await withTimeout(parseCsvBuffer(buffer), PARSE_TIMEOUT_MS, 'CSV parse');
        await insertTabularRows(importId, importFileId, headers, rows, importRow.import_type);
        await finishParse(importFileId, importId, importRow, owner, 'map');
      } else if (ext === 'xlsx' || mime.includes('spreadsheetml') || mime === 'application/vnd.ms-excel') {
        const { headers, rows } = await withTimeout(parseXlsxBuffer(buffer), PARSE_TIMEOUT_MS, 'XLSX parse');
        await insertTabularRows(importId, importFileId, headers, rows, importRow.import_type);
        await finishParse(importFileId, importId, importRow, owner, 'map');
      } else {
        throw new Error(`No parser available for detected type "${mime || ext}"`);
      }
    } catch (err) {
      await db('import_files')
        .where({ id: importFileId })
        .update({ parser_status: 'failed', upload_status: 'failed', parser_error: err.message, updated_at: db.fn.now() });
      publishImportEvent({ importId, importFileId, ...owner, type: 'file:parse_failed', payload: { reason: err.message } });
    }
  },
  { connection, concurrency: 4 }
);

async function insertTabularRows(importId, importFileId, headers, rows, importType) {
  if (rows.length) {
    const rowsToInsert = rows.map((r, idx) => ({
      import_id: importId,
      import_file_id: importFileId,
      row_number: idx + 1,
      raw_json: JSON.stringify(r),
      status: 'pending',
    }));
    await db('import_rows').insert(rowsToInsert);
  }
  if (headers.length) {
    const mappingsToInsert = headers.map((h) => ({
      import_id: importId,
      import_file_id: importFileId,
      source_column: h,
      target_field: null,
      is_manual_override: false,
    }));
    await db('import_field_mappings').insert(mappingsToInsert);
  }
}

async function finishParse(importFileId, importId, importRow, owner, nextStage) {
  await db('import_files').where({ id: importFileId }).update({ parser_status: 'parsed', upload_status: 'parsed', updated_at: db.fn.now() });
  publishImportEvent({ importId, importFileId, ...owner, type: 'file:parsed', payload: {} });

  if (nextStage === 'extract') {
    await importExtractQueue.add('extract', { importFileId, importId }, { jobId: `extract-${importFileId}` });
  } else if (nextStage === 'map') {
    await importMapQueue.add('map', { importFileId, importId }, { jobId: `map-${importFileId}` });
  } else if (nextStage === 'dedupe') {
    await importDedupeQueue.add('dedupe', { importFileId, importId }, { jobId: `dedupe-${importFileId}` });
  }
}

importParseWorker.on('failed', (job, err) => {
  // eslint-disable-next-line no-console
  console.error(`[worker] import-parse job ${job?.id} failed`, err.message);
});
