'use client';

import { useCallback, useRef, useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useFileUpload } from '@/lib/imports/useFileUpload';
import { useImportStatus } from '@/lib/imports/useImports';
import type { FileUploadStatus, ImportFile, ImportType } from '@/lib/imports/types';

const EXTENSIONS_BY_TYPE: Record<ImportType, string[]> = {
  cv: ['pdf', 'docx', 'doc', 'txt'],
  profile: ['pdf', 'docx', 'doc', 'txt'],
  company: ['csv', 'xlsx'],
  contacts: ['csv', 'xlsx', 'vcf'],
};

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // mirrors imports.service.js MAX_UPLOAD_BYTES

/** Human labels for every real server-reported pipeline stage — never invents a stage the
 * backend hasn't reported. Order mirrors the state machine in imports_core migration. */
const STAGE_LABEL: Record<FileUploadStatus, string> = {
  pending: 'Queued',
  uploading: 'Uploading',
  uploaded: 'Uploaded',
  quarantined: 'Quarantined — scanning',
  scanning: 'Scanning for threats',
  scan_failed: 'Scan failed',
  sanitizing: 'Sanitizing',
  ready_for_parse: 'Ready to parse',
  parsing: 'Parsing',
  parsed: 'Ready for review',
  needs_review: 'Needs review',
  failed: 'Failed',
  imported: 'Imported',
};

function stageTone(status: FileUploadStatus): 'brand' | 'success' | 'danger' | 'neutral' {
  if (status === 'failed' || status === 'scan_failed') return 'danger';
  if (status === 'parsed' || status === 'imported') return 'success';
  if (status === 'needs_review') return 'neutral';
  return 'brand';
}

type LocalUpload = {
  localId: string;
  file: File;
  progress: number;
  phase: 'requesting' | 'uploading' | 'finalizing' | 'done' | 'error';
  error?: string;
};

export function FileDropzone({
  importId,
  importType,
  maxFiles = 50,
  onUploaded,
}: {
  importId: string;
  importType: ImportType;
  maxFiles?: number;
  onUploaded?: (importFileId: string) => void;
}) {
  const { uploadFile } = useFileUpload(importId);
  const { data: status } = useImportStatus(importId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localUploads, setLocalUploads] = useState<LocalUpload[]>([]);
  const [rejectedMessage, setRejectedMessage] = useState<string | null>(null);

  const allowedExtensions = EXTENSIONS_BY_TYPE[importType];
  const acceptAttr = allowedExtensions.map((e) => `.${e}`).join(',');

  const validate = useCallback(
    (file: File): string | null => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (!allowedExtensions.includes(ext)) {
        return `.${ext || '?'} isn't a supported file type. Allowed: ${allowedExtensions.join(', ').toUpperCase()}.`;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        return `${file.name} is larger than the 25MB limit.`;
      }
      return null;
    },
    [allowedExtensions]
  );

  const handleFiles = useCallback(
    (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      setRejectedMessage(null);

      const existingCount = (status?.files.length ?? 0) + localUploads.length;
      if (existingCount + files.length > maxFiles) {
        setRejectedMessage(`You can upload up to ${maxFiles} files at a time.`);
        return;
      }

      for (const file of files) {
        const validationError = validate(file);
        if (validationError) {
          setRejectedMessage(validationError);
          continue;
        }

        const localId = `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        setLocalUploads((prev) => [...prev, { localId, file, progress: 0, phase: 'requesting' }]);

        uploadFile(file, {
          onProgress: (phase, percent) => {
            setLocalUploads((prev) => prev.map((u) => (u.localId === localId ? { ...u, phase, progress: percent } : u)));
          },
        })
          .then(({ importFileId }) => {
            setLocalUploads((prev) => prev.filter((u) => u.localId !== localId));
            onUploaded?.(importFileId);
          })
          .catch((err: Error) => {
            setLocalUploads((prev) => prev.map((u) => (u.localId === localId ? { ...u, phase: 'error', error: err.message } : u)));
          });
      }
    },
    [localUploads.length, maxFiles, onUploaded, status?.files.length, uploadFile, validate]
  );

  const serverFiles: ImportFile[] = status?.files ?? [];

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          'flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-colors',
          dragOver ? 'border-brand-500 bg-brand-50/60' : 'border-brand-200 bg-brand-50/20'
        )}
      >
        <UploadCloud className="h-10 w-10 text-brand-500" />
        <p className="mt-4 text-base font-semibold text-gray-900">Drag and drop {importType === 'company' ? 'company data' : importType === 'contacts' ? 'contact' : importType === 'cv' ? 'CV' : 'profile'} files here</p>
        <p className="mt-1 text-sm text-gray-400">or</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-3 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Choose files
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={acceptAttr}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <p className="mt-4 text-xs text-gray-400">
          {allowedExtensions.map((e) => e.toUpperCase()).join(', ')} up to 25MB each
        </p>
        <p className="text-xs text-gray-400">You can upload up to {maxFiles} files at a time</p>
      </div>

      {rejectedMessage && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-red-600">
          <XCircle className="h-4 w-4" /> {rejectedMessage}
        </p>
      )}

      {(localUploads.length > 0 || serverFiles.length > 0) && (
        <ul className="mt-4 space-y-2">
          {localUploads.map((u) => (
            <li key={u.localId} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
              <FileText className="h-5 w-5 shrink-0 text-gray-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{u.file.name}</p>
                {u.phase === 'error' ? (
                  <p className="text-xs text-red-600">{u.error}</p>
                ) : (
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all"
                      style={{ width: `${u.phase === 'finalizing' || u.phase === 'done' ? 100 : u.progress}%` }}
                    />
                  </div>
                )}
              </div>
              <span className="shrink-0 text-xs font-semibold text-gray-500">
                {u.phase === 'requesting' && 'Preparing…'}
                {u.phase === 'uploading' && `Uploading ${u.progress}%`}
                {u.phase === 'finalizing' && 'Finalizing…'}
                {u.phase === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
              </span>
            </li>
          ))}

          {serverFiles.map((f) => (
            <li key={f.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
              <FileText className="h-5 w-5 shrink-0 text-gray-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{f.safe_display_name || f.original_filename}</p>
                {f.parser_error && <p className="text-xs text-red-600">{f.parser_error}</p>}
              </div>
              <StageBadge status={f.upload_status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StageBadge({ status }: { status: FileUploadStatus }) {
  const tone = stageTone(status);
  const isActive = !['parsed', 'imported', 'failed', 'scan_failed', 'needs_review'].includes(status);
  const toneClass =
    tone === 'success'
      ? 'bg-green-50 text-green-700'
      : tone === 'danger'
        ? 'bg-red-50 text-red-700'
        : tone === 'neutral'
          ? 'bg-amber-50 text-amber-700'
          : 'bg-brand-50 text-brand-700';
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', toneClass)}>
      {isActive && <Loader2 className="h-3 w-3 animate-spin" />}
      {status === 'parsed' || status === 'imported' ? <CheckCircle2 className="h-3 w-3" /> : null}
      {status === 'failed' || status === 'scan_failed' ? <XCircle className="h-3 w-3" /> : null}
      {STAGE_LABEL[status]}
    </span>
  );
}
