'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, Sparkles, Download } from 'lucide-react';
import { WizardShell, AutosaveIndicator } from '@/components/wizard/WizardShell';
import { WizardStepper } from '@/components/wizard/WizardStepper';
import { FileDropzone } from '@/components/imports/FileDropzone';
import { Button } from '@/components/ui/Button';
import { getApiErrorMessage } from '@/lib/api';
import {
  useCreateImport,
  useImportStatus,
  useMappings,
  useUpdateMappings,
  useDedupeMatches,
  useDedupeDecision,
  useValidateImport,
  useCommitImport,
  useRecentImports,
  useTargetFields,
} from '@/lib/imports/useImports';
import { TARGET_FIELD_LABELS } from '@/lib/imports/fieldAllowlist';
import type { ImportType, DedupeDecision } from '@/lib/imports/types';

const STEP_LABELS = ['Upload', 'Parse & Review', 'Map Fields', 'Review & Confirm', 'Complete'];

export type ImportWizardCopy = {
  pageId: string;
  title: string;
  subtitle: string;
  entityLabelSingular: string; // e.g. "profile", "company", "contact"
  entityLabelPlural: string;
  whatHappensNext: string[];
  aiTip: string;
  templateDownload?: { filename: string };
};

// Maps a resumed import's server status to the wizard step it belongs on,
// so revisiting via ?importId= (or clicking an in-progress row in "Recent
// imports") lands the user back where they left off instead of restarting.
const STEP_INDEX_BY_STATUS: Record<string, number> = {
  draft: 0,
  uploading: 0,
  scanning: 1,
  parsing: 1,
  mapping: 2,
  validating: 3,
  ready_to_commit: 3,
  committing: 4,
  completed: 4,
  failed: 4,
  cancelled: 4,
};

export function ImportWizard({ importType, copy }: { importType: ImportType; copy: ImportWizardCopy }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeImportId = searchParams.get('importId');

  const [step, setStep] = useState(0);
  const [importId, setImportId] = useState<string | null>(resumeImportId);
  const [error, setError] = useState<string | null>(null);
  const [hasResumedStep, setHasResumedStep] = useState(!resumeImportId);

  const createImport = useCreateImport();
  const { data: status } = useImportStatus(importId);
  const { data: mappings } = useMappings(step >= 2 ? importId : null);
  const updateMappings = useUpdateMappings(importId ?? '');
  const { data: dedupeMatches } = useDedupeMatches(step >= 3 ? importId : null);
  const dedupeDecision = useDedupeDecision(importId ?? '');
  const validateImport = useValidateImport(importId ?? '');
  const commitImport = useCommitImport(importId ?? '');
  const { data: recentImports } = useRecentImports(importType);

  const [mappingDraft, setMappingDraft] = useState<Record<string, string | null>>({});
  const [validated, setValidated] = useState(false);
  const [committed, setCommitted] = useState(false);

  // Create the backing import record once, lazily — but only when NOT
  // resuming an existing one via ?importId= (set from useState above).
  useEffect(() => {
    if (importId || createImport.isPending) return;
    createImport
      .mutateAsync(importType)
      .then((record) => setImportId(record.id))
      .catch((err) => setError(getApiErrorMessage(err, 'Could not start a new import.')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importType]);

  // Once a resumed import's status is known, jump to the step it left off
  // at (only once — afterwards the user's own step navigation takes over).
  useEffect(() => {
    if (hasResumedStep || !status) return;
    setStep(STEP_INDEX_BY_STATUS[status.status] ?? 0);
    setHasResumedStep(true);
  }, [hasResumedStep, status]);

  function resumeImport(id: string) {
    setImportId(id);
    setHasResumedStep(false);
    router.replace(`?importId=${id}`, { scroll: false });
  }

  useEffect(() => {
    if (mappings) {
      setMappingDraft(Object.fromEntries(mappings.map((m) => [m.id, m.target_field])));
    }
  }, [mappings]);

  const { data: allowedFields = [] } = useTargetFields(importType);
  const files = status?.files ?? [];
  const hasUploadedFile = files.length > 0;
  const allFilesParsed = files.length > 0 && files.every((f) => f.parser_status === 'parsed' && f.scan_status === 'clean');
  const anyFileFailed = files.some((f) => f.upload_status === 'failed' || f.upload_status === 'scan_failed' || f.parser_status === 'failed');
  const pendingDedupe = (dedupeMatches ?? []).filter((m) => m.decision === 'pending');
  const isCommitting = status?.status === 'committing';
  const isTerminal = status ? ['completed', 'failed', 'cancelled'].includes(status.status) : false;

  const saveState = createImport.isPending || updateMappings.isPending ? 'saving' : importId ? 'saved' : 'idle';

  async function handleSaveMappings() {
    if (!importId || !mappings) return;
    try {
      await updateMappings.mutateAsync(mappings.map((m) => ({ id: m.id, targetField: mappingDraft[m.id] ?? null })));
      setStep(3);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  async function handleDecision(matchId: string, decision: DedupeDecision) {
    setError(null);
    try {
      await dedupeDecision.mutateAsync({ matchId, decision });
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  async function handleValidate() {
    setError(null);
    try {
      await validateImport.mutateAsync();
      setValidated(true);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  async function handleCommit() {
    setError(null);
    try {
      await commitImport.mutateAsync();
      setCommitted(true);
      setStep(4);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  function downloadTemplate() {
    if (!copy.templateDownload || allowedFields.length === 0) return;
    // Headers come from the live server allowlist (useTargetFields above) —
    // never a client-hardcoded list that could drift from what PATCH
    // /mappings actually accepts.
    const csv = allowedFields.join(',') + '\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = copy.templateDownload.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <WizardShell pageId={copy.pageId} pageName={copy.title} route={typeof window !== 'undefined' ? window.location.pathname : ''} hideBrandHeader>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">{copy.title}</h1>
          <p className="max-w-2xl text-gray-500">{copy.subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <AutosaveIndicator state={saveState} lastSavedAt={new Date()} />
          <Link
            href="/app/setup-checklist"
            className="whitespace-nowrap rounded-lg border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-600 hover:bg-brand-50"
          >
            Save &amp; exit
          </Link>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white px-5 py-4">
        <WizardStepper steps={STEP_LABELS.map((label) => ({ label, helper: '' }))} currentIndex={step} />
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <XCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            {step === 0 && importId && (
              <>
                <FileDropzone importId={importId} importType={importType} onUploaded={() => setError(null)} />
                {copy.templateDownload && (
                  <button
                    type="button"
                    onClick={downloadTemplate}
                    disabled={allowedFields.length === 0}
                    className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline"
                  >
                    <Download className="h-4 w-4" /> Download CSV template
                  </button>
                )}
                <div className="mt-6 flex justify-end">
                  <Button disabled={!hasUploadedFile} onClick={() => setStep(1)}>
                    Continue
                  </Button>
                </div>
              </>
            )}

            {step === 1 && (
              <div>
                <h2 className="text-lg font-bold text-gray-900">Parsing your files</h2>
                <p className="mt-1 text-sm text-gray-500">
                  We&apos;re scanning, sanitizing, and parsing every file you uploaded. This updates automatically — no need to refresh.
                </p>
                <ul className="mt-4 space-y-2">
                  {files.map((f) => (
                    <li key={f.id} className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 text-sm">
                      <span className="truncate font-medium text-gray-900">{f.safe_display_name || f.original_filename}</span>
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                        {f.parser_status === 'parsed' && f.scan_status === 'clean' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : f.upload_status === 'failed' || f.upload_status === 'scan_failed' || f.parser_status === 'failed' ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
                        )}
                        {f.parser_error || f.upload_status}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex justify-between">
                  <Button variant="outline" onClick={() => setStep(0)}>
                    Back
                  </Button>
                  <Button disabled={!allFilesParsed} onClick={() => setStep(2)}>
                    {anyFileFailed ? 'Some files failed — continue with the rest' : 'Continue'}
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="text-lg font-bold text-gray-900">Map your columns</h2>
                <p className="mt-1 text-sm text-gray-500">We suggested a mapping for each column. Review and adjust before continuing.</p>
                <div className="mt-4 space-y-3">
                  {(mappings ?? []).map((m) => (
                    <div key={m.id} className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">{m.source_column}</p>
                        {m.confidence !== null && <p className="text-xs text-gray-400">Suggested match confidence: {Math.round(m.confidence * 100)}%</p>}
                      </div>
                      <select
                        value={mappingDraft[m.id] ?? ''}
                        onChange={(e) => setMappingDraft((prev) => ({ ...prev, [m.id]: e.target.value || null }))}
                        className="h-10 w-56 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      >
                        <option value="">Don&apos;t import this column</option>
                        {allowedFields.map((field) => (
                          <option key={field} value={field}>
                            {TARGET_FIELD_LABELS[field] ?? field}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                  {(mappings ?? []).length === 0 && <p className="text-sm text-gray-400">No columns to map yet — this file type is mapped automatically.</p>}
                </div>
                <div className="mt-6 flex justify-between">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button loading={updateMappings.isPending} onClick={handleSaveMappings}>
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 className="text-lg font-bold text-gray-900">Review &amp; confirm</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {pendingDedupe.length > 0
                    ? `We found ${dedupeMatches?.length} possible duplicate${dedupeMatches?.length === 1 ? '' : 's'}. Decide how to handle each before continuing.`
                    : 'No possible duplicates were found. Validate and commit to finish the import.'}
                </p>

                {(dedupeMatches ?? []).length > 0 && (
                  <ul className="mt-4 space-y-3">
                    {(dedupeMatches ?? []).map((match) => (
                      <li key={match.id} className="rounded-xl border border-gray-200 px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              Possible match — existing {match.candidate_entity_type} ({Math.round(match.match_score * 100)}% match)
                            </p>
                            {match.match_reason_codes?.length > 0 && (
                              <p className="text-xs text-gray-400">{match.match_reason_codes.join(', ')}</p>
                            )}
                          </div>
                          {match.decision !== 'pending' && (
                            <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                              {match.decision.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                        {match.decision === 'pending' && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(['merge', 'link', 'create_new', 'ignore'] as DedupeDecision[]).map((d) => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => handleDecision(match.id, d)}
                                disabled={dedupeDecision.isPending}
                                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-brand-400 hover:text-brand-700 disabled:opacity-50"
                              >
                                {d === 'merge' ? 'Merge' : d === 'link' ? 'Link as related' : d === 'create_new' ? 'Create new' : 'Ignore'}
                              </button>
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <div className="flex items-center gap-3">
                    {!validated ? (
                      <Button
                        disabled={pendingDedupe.length > 0}
                        loading={validateImport.isPending}
                        onClick={handleValidate}
                      >
                        Validate
                      </Button>
                    ) : (
                      <Button loading={commitImport.isPending || committed} onClick={handleCommit}>
                        Commit &amp; import
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <ImportCompleteStep status={status?.status} rowCounts={status?.rowCounts} entityLabelPlural={copy.entityLabelPlural} isCommitting={isCommitting} isTerminal={isTerminal} />
            )}
          </div>

          {step === 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h3 className="text-sm font-bold text-gray-900">Recent imports</h3>
              {!recentImports || recentImports.length === 0 ? (
                <p className="mt-2 text-sm text-gray-400">No previous {copy.entityLabelPlural} imports yet.</p>
              ) : (
                <ul className="mt-3 divide-y divide-gray-100">
                  {recentImports.map((r) => {
                    const isTerminalRow = ['completed', 'failed', 'cancelled'].includes(r.status);
                    return (
                      <li key={r.id} className="flex items-center justify-between py-3 text-sm">
                        <div>
                          <p className="font-medium text-gray-900">Import {r.id.slice(0, 8)}</p>
                          <p className="text-xs text-gray-400">
                            {r.status === 'completed' ? `Completed ${new Date(r.updated_at).toLocaleDateString()}` : r.status.replace('_', ' ')}
                          </p>
                        </div>
                        {isTerminalRow || r.id === importId ? (
                          <span
                            className={
                              'rounded-full px-2.5 py-1 text-xs font-semibold ' +
                              (r.status === 'completed'
                                ? 'bg-green-50 text-green-700'
                                : r.status === 'failed' || r.status === 'cancelled'
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-brand-50 text-brand-700')
                            }
                          >
                            {r.status === 'completed' ? 'Imported' : r.status.replace('_', ' ')}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => resumeImport(r.id)}
                            className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100"
                          >
                            Resume
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-bold text-gray-900">What happens next?</h3>
            <ul className="mt-3 space-y-2.5 text-sm text-gray-600">
              {copy.whatHappensNext.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gray-300" /> {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-5">
            <p className="flex items-center gap-1.5 text-sm font-bold text-brand-700">
              <Sparkles className="h-4 w-4" /> AI Tip
            </p>
            <p className="mt-2 text-sm text-brand-700/80">{copy.aiTip}</p>
          </div>
        </aside>
      </div>
    </WizardShell>
  );
}

function ImportCompleteStep({
  status,
  rowCounts,
  entityLabelPlural,
  isCommitting,
  isTerminal,
}: {
  status?: string;
  rowCounts?: Record<string, number>;
  entityLabelPlural: string;
  isCommitting: boolean;
  isTerminal: boolean;
}) {
  if (!isTerminal) {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
        <p className="mt-4 text-lg font-bold text-gray-900">Importing your {entityLabelPlural}…</p>
        <p className="mt-1 text-sm text-gray-500">
          {isCommitting ? 'Committing records now — this can take a moment for larger files.' : 'Finishing up…'}
        </p>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <XCircle className="h-10 w-10 text-red-500" />
        <p className="mt-4 text-lg font-bold text-gray-900">The import failed</p>
        <p className="mt-1 text-sm text-gray-500">Contact support if this keeps happening — no partial data was silently applied.</p>
      </div>
    );
  }

  const committed = rowCounts?.committed ?? 0;
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <CheckCircle2 className="h-10 w-10 text-green-500" />
      <p className="mt-4 text-lg font-bold text-gray-900">Import complete</p>
      <p className="mt-1 text-sm text-gray-500">
        {committed} {entityLabelPlural} imported successfully.
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/app/setup-checklist" className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700">
          Back to setup checklist
        </Link>
        <Link href="/app/live-feed" className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white">
          Go to Gigvora
        </Link>
      </div>
    </div>
  );
}
