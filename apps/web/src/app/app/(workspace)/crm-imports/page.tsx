'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Check, Loader2, Upload } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { CrmLocalNav } from '@/components/crm/CrmLocalNav';
import { useCreateCrmImportJob, useAddCrmImportRows, useProcessCrmImportJob } from '@/hooks/crm/useCrmImports';
import type { CrmImportJob } from '@/hooks/crm/types';
import { getApiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';

const selectClass =
  'h-9 rounded-lg border border-ink-200 bg-white px-2.5 text-xs font-semibold text-ink-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200';

const FIELD_OPTIONS: { value: string; label: string }[] = [
  { value: 'ignore', label: 'Ignore this column' },
  { value: 'firstName', label: 'First name' },
  { value: 'lastName', label: 'Last name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'jobTitle', label: 'Job title' },
  { value: 'companyName', label: 'Company name' },
];

const STEPS = [
  { n: 1, label: 'Source' },
  { n: 2, label: 'Map fields' },
  { n: 3, label: 'Ownership' },
  { n: 4, label: 'Review' },
  { n: 5, label: 'Import' },
];

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const parseLine = (line: string) => line.split(',').map((cell) => cell.trim().replace(/^"(.*)"$/, '$1'));
  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

function suggestField(header: string): string {
  const h = header.toLowerCase();
  if (h.includes('first')) return 'firstName';
  if (h.includes('last')) return 'lastName';
  if (h.includes('email')) return 'email';
  if (h.includes('phone') || h.includes('mobile')) return 'phone';
  if (h.includes('title')) return 'jobTitle';
  if (h.includes('company')) return 'companyName';
  return 'ignore';
}

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {STEPS.map((s, i) => {
        const isDone = s.n < step;
        const isActive = s.n === step;
        return (
          <div key={s.n} className="flex shrink-0 items-center gap-1">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold',
                  isDone
                    ? 'bg-brand-600 text-white'
                    : isActive
                      ? 'border-2 border-brand-600 text-brand-700 dark:text-brand-400'
                      : 'border border-ink-200 text-ink-400 dark:border-ink-700 dark:text-ink-500'
                )}
              >
                {isDone ? <Check className="h-4 w-4" /> : s.n}
              </div>
              <span className={cn('whitespace-nowrap text-[11px] font-semibold', isActive ? 'text-brand-700 dark:text-brand-400' : 'text-ink-400 dark:text-ink-500')}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && <div className={cn('mx-1 mb-4 h-px w-8', isDone ? 'bg-brand-600' : 'bg-ink-200 dark:bg-ink-700')} />}
          </div>
        );
      })}
    </div>
  );
}

export default function CrmImportsPage() {
  const [step, setStep] = useState(1);
  const [csvText, setCsvText] = useState('');
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [tagsInput, setTagsInput] = useState('');
  const [sourceInput, setSourceInput] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [resultJob, setResultJob] = useState<CrmImportJob | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const { headers, rows } = useMemo(() => parseCsv(csvText), [csvText]);

  const createImportJob = useCreateCrmImportJob();
  const addImportRows = useAddCrmImportRows();
  const processImportJob = useProcessCrmImportJob();

  function handleCsvChange(value: string) {
    setCsvText(value);
    const { headers: newHeaders } = parseCsv(value);
    setMapping(Object.fromEntries(newHeaders.map((h) => [h, suggestField(h)])));
  }

  const mappedFieldCount = Object.values(mapping).filter((v) => v && v !== 'ignore').length;
  const tags = tagsInput
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  function resetWizard() {
    setStep(1);
    setCsvText('');
    setMapping({});
    setTagsInput('');
    setSourceInput('');
    setImportError(null);
    setResultJob(null);
    setIsImporting(false);
    createImportJob.reset();
    addImportRows.reset();
    processImportJob.reset();
  }

  async function startImport() {
    setStep(5);
    setIsImporting(true);
    setImportError(null);
    try {
      const job = await createImportJob.mutateAsync({
        source: 'csv_paste',
        fileName: 'pasted.csv',
        fieldMappingJsonb: mapping,
      });

      const mappedRows = rows.map((row) => {
        const obj: Record<string, unknown> = {};
        headers.forEach((h, i) => {
          const field = mapping[h];
          if (field && field !== 'ignore') obj[field] = row[i];
        });
        if (tags.length) obj.tags = tags;
        if (sourceInput.trim()) obj.source = sourceInput.trim();
        return obj;
      });

      await addImportRows.mutateAsync({ id: job.id, rows: mappedRows });
      const processed = await processImportJob.mutateAsync(job.id);
      setResultJob(processed);
    } catch (e) {
      setImportError(getApiErrorMessage(e));
    } finally {
      setIsImporting(false);
    }
  }

  const canContinueStep1 = rows.length > 0;
  const canContinueStep2 = mappedFieldCount > 0;

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 pb-24 lg:px-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
          <Upload className="h-5 w-5 text-brand-600" /> Import Contacts
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Bring contacts in from a spreadsheet with field mapping, duplicate detection, and enrichment.</p>
      </div>

      <CrmLocalNav active="imports" />

      <Card className="p-5">
        <StepIndicator step={step} />
      </Card>

      {step === 1 && (
        <Card className="p-5">
          <CardHeader title="Paste your spreadsheet data" className="px-0 pt-0" />
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            Copy a range from a spreadsheet (or paste raw CSV text) below. The first line must be your column headers, and columns should be comma-separated.
          </p>
          <textarea
            value={csvText}
            onChange={(e) => handleCsvChange(e.target.value)}
            placeholder={'firstName,lastName,email,company\nAva,Chen,ava@example.com,Northwind Co'}
            rows={8}
            className="mt-3 w-full rounded-control border border-ink-200 bg-white px-3 py-2.5 font-mono text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white dark:placeholder:text-ink-500"
          />

          {rows.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">
                Preview — {rows.length} row{rows.length === 1 ? '' : 's'} detected
              </p>
              <div className="overflow-hidden rounded-xl border border-ink-100 dark:border-ink-800">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400 dark:border-ink-800 dark:text-ink-500">
                      <tr>
                        {headers.map((h) => (
                          <th key={h} className="px-3 py-2 font-medium">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-b border-ink-50 last:border-0 dark:border-ink-800/60">
                          {headers.map((h, j) => (
                            <td key={h} className="px-3 py-2 text-ink-600 dark:text-ink-300">
                              {row[j] || <span className="text-ink-300">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {csvText.length > 0 && rows.length === 0 && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" /> Couldn&apos;t detect any data rows — make sure the first line is a header row.
            </p>
          )}
        </Card>
      )}

      {step === 2 && (
        <Card className="p-5">
          <CardHeader title="Map your columns to contact fields" className="px-0 pt-0" />
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">We&apos;ve auto-suggested mappings based on your column names — adjust any that aren&apos;t right.</p>
          <div className="mt-3 overflow-hidden rounded-xl border border-ink-100 dark:border-ink-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400 dark:border-ink-800 dark:text-ink-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Column</th>
                  <th className="px-3 py-2 font-medium">Sample value</th>
                  <th className="px-3 py-2 font-medium">Maps to</th>
                </tr>
              </thead>
              <tbody>
                {headers.map((h, i) => (
                  <tr key={h} className="border-b border-ink-50 last:border-0 dark:border-ink-800/60">
                    <td className="px-3 py-2.5 font-semibold text-ink-900 dark:text-white">{h}</td>
                    <td className="px-3 py-2.5 text-ink-500 dark:text-ink-400">{rows[0]?.[i] || <span className="text-ink-300">—</span>}</td>
                    <td className="px-3 py-2.5">
                      <select
                        value={mapping[h] || 'ignore'}
                        onChange={(e) => setMapping((prev) => ({ ...prev, [h]: e.target.value }))}
                        className={selectClass}
                      >
                        {FIELD_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!canContinueStep2 && <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">Map at least one column to a contact field to continue.</p>}
        </Card>
      )}

      {step === 3 && (
        <Card className="p-5">
          <CardHeader title="Ownership & tags" className="px-0 pt-0" />
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Applied to every contact created or updated by this import.</p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Tags</label>
              <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="e.g. conference-2026, warm-lead" />
              {tags.length > 0 && <p className="mt-1 text-xs text-ink-400 dark:text-ink-500">{tags.length} tag{tags.length === 1 ? '' : 's'} will be applied</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Source</label>
              <Input value={sourceInput} onChange={(e) => setSourceInput(e.target.value)} placeholder="e.g. trade-show-import" />
            </div>
          </div>
        </Card>
      )}

      {step === 4 && (
        <Card className="p-5">
          <CardHeader title="Review before importing" className="px-0 pt-0" />
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Confirm the summary below, then start the import.</p>
          <KpiGrid className="mt-4">
            <KpiCard label="Rows detected" value={rows.length} />
            <KpiCard label="Fields mapped" value={mappedFieldCount} />
            <KpiCard label="Tags applied" value={tags.length} />
            <KpiCard label="Source" value={sourceInput.trim() || '—'} />
          </KpiGrid>
          <div className="mt-5 flex justify-end">
            <Button onClick={startImport}>Start import</Button>
          </div>
        </Card>
      )}

      {step === 5 && (
        <Card className="p-8">
          {isImporting && !resultJob && !importError && (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
              <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Importing your rows…</p>
              <p className="text-sm text-ink-400 dark:text-ink-500">Matching against existing contacts and running duplicate detection.</p>
            </div>
          )}

          {importError && (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Import failed</p>
              <p className="max-w-sm text-sm text-ink-400 dark:text-ink-500">{importError}</p>
              <div className="mt-2 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setStep(4)}>
                  Back
                </Button>
                <Button size="sm" onClick={startImport}>
                  Retry
                </Button>
              </div>
            </div>
          )}

          {resultJob && !importError && (
            <div>
              <div className="mb-4 flex flex-col items-center gap-2 text-center">
                <Check className="h-8 w-8 rounded-full bg-emerald-50 p-1.5 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400" />
                <p className="text-base font-bold text-ink-900 dark:text-white">Import complete</p>
                <p className="text-sm text-ink-400 dark:text-ink-500">{resultJob.total_rows} row{resultJob.total_rows === 1 ? '' : 's'} processed</p>
              </div>
              <KpiGrid>
                <KpiCard label="Created" value={resultJob.created_count} tone="success" />
                <KpiCard label="Updated" value={resultJob.updated_count} tone="brand" />
                <KpiCard label="Skipped" value={resultJob.skipped_count} />
                <KpiCard label="Failed" value={resultJob.failed_count} tone={resultJob.failed_count > 0 ? 'danger' : 'default'} />
                <KpiCard label="Duplicates flagged" value={resultJob.duplicate_count} tone="warning" />
              </KpiGrid>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Link href="/app/crm-contacts">
                  <Button>View contacts</Button>
                </Link>
                <Button variant="outline" onClick={resetWizard}>
                  Start another import
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {step < 5 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-ink-100 bg-white/95 px-4 py-3 backdrop-blur dark:border-ink-800 dark:bg-ink-950/95">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between lg:px-6">
            <Button variant="outline" disabled={step === 1} onClick={() => setStep((s) => Math.max(1, s - 1))}>
              Back
            </Button>
            {step < 4 && (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={(step === 1 && !canContinueStep1) || (step === 2 && !canContinueStep2)}
              >
                Continue
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
