export type ImportType = 'cv' | 'profile' | 'company' | 'contacts';

export type ImportRecordStatus =
  | 'draft'
  | 'uploading'
  | 'scanning'
  | 'parsing'
  | 'mapping'
  | 'validating'
  | 'ready_to_commit'
  | 'committing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ImportRecord = {
  id: string;
  owner_type: 'user' | 'company';
  owner_id: string;
  workspace_id: string | null;
  import_type: ImportType;
  status: ImportRecordStatus;
  source: string | null;
  summary_json: Record<string, unknown>;
  created_by: string;
  committed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  files?: ImportFile[];
};

export type FileUploadStatus =
  | 'pending'
  | 'uploading'
  | 'uploaded'
  | 'quarantined'
  | 'scanning'
  | 'scan_failed'
  | 'sanitizing'
  | 'ready_for_parse'
  | 'parsing'
  | 'parsed'
  | 'needs_review'
  | 'failed'
  | 'imported';

export type ScanStatus = 'pending' | 'clean' | 'infected' | 'suspicious' | 'error';
export type SanitizationStatus = 'pending' | 'not_needed' | 'sanitized' | 'failed';
export type ParserStatus = 'pending' | 'parsing' | 'parsed' | 'failed';

export type ImportFile = {
  id: string;
  import_id: string;
  original_filename: string;
  safe_display_name: string;
  storage_key?: string;
  mime_type_declared: string | null;
  mime_type_detected?: string | null;
  size_bytes: number | null;
  upload_status: FileUploadStatus;
  scan_status: ScanStatus;
  sanitization_status: SanitizationStatus;
  parser_status: ParserStatus;
  parser_error: string | null;
};

export type ImportStatusResponse = {
  id: string;
  status: ImportRecordStatus;
  importType: ImportType;
  files: ImportFile[];
  rowCounts: Record<string, number>;
};

export type ImportFieldMapping = {
  id: string;
  import_id: string;
  import_file_id: string | null;
  source_column: string;
  target_field: string | null;
  confidence: number | null;
  model_name: string | null;
  model_version: string | null;
  is_manual_override: boolean;
  created_at: string;
  updated_at: string;
};

export type DedupeDecision = 'pending' | 'merge' | 'link' | 'create_new' | 'ignore';

export type ImportDedupeMatch = {
  id: string;
  import_id: string;
  import_row_id: string;
  candidate_entity_type: string;
  candidate_entity_id: string;
  match_score: number;
  match_reason_codes: string[];
  decision: DedupeDecision;
  decided_by: string | null;
  decided_at: string | null;
  model_name: string | null;
  model_version: string | null;
  created_at: string;
  updated_at: string;
};

export type UploadUrlResponse = {
  importFileId: string;
  uploadUrl: string;
  storageKey: string;
  expiresInSeconds: number;
};

/** Pipeline stages that mean "still actively processing" — the status/file poll should keep
 * refetching while any of these are true so the UI never freezes on a stale stage. */
export const ACTIVE_IMPORT_STATUSES: ImportRecordStatus[] = ['uploading', 'scanning', 'parsing', 'mapping', 'validating', 'committing'];

export const ACTIVE_FILE_UPLOAD_STATUSES: FileUploadStatus[] = [
  'pending',
  'uploading',
  'uploaded',
  'quarantined',
  'scanning',
  'sanitizing',
  'ready_for_parse',
  'parsing',
];

export function isImportActive(status: ImportRecordStatus | undefined, files: ImportFile[] | undefined): boolean {
  if (status && ACTIVE_IMPORT_STATUSES.includes(status)) return true;
  if (files?.some((f) => ACTIVE_FILE_UPLOAD_STATUSES.includes(f.upload_status))) return true;
  return false;
}
