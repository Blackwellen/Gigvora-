'use client';

import { X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { humanizeFieldKey } from './fieldLabels';
import type { OnboardingFieldOption, OnboardingStepField, OnboardingStepSchema } from '@/lib/onboarding/types';

export type OnboardingDraft = Record<string, unknown>;

function resolveInputKind(field: OnboardingStepField): 'text' | 'textarea' | 'select' | 'tags' | 'checkbox' | 'number' | 'email' | 'url' | 'date' {
  if (field.inputType) return field.inputType;
  if (field.options && field.options.length > 0) return 'select';
  if (field.type === 'boolean') return 'checkbox';
  if (field.type === 'number') return 'number';
  if (field.type === 'array') return 'tags';
  if (field.multiline) return 'textarea';
  const key = field.key.toLowerCase();
  if (key.includes('email')) return 'email';
  if (key.includes('url') || key.includes('website') || key.includes('link')) return 'url';
  if (key.includes('bio') || key.includes('summary') || key.includes('description') || key.includes('goals') || key.includes('notes')) {
    return 'textarea';
  }
  return 'text';
}

function isFullWidth(field: OnboardingStepField, kind: string): boolean {
  if (field.fullWidth !== undefined) return field.fullWidth;
  return kind === 'textarea' || kind === 'tags';
}

function optionValue(opt: OnboardingFieldOption): { value: string; label: string } {
  if (typeof opt === 'string') return { value: opt, label: opt };
  return opt;
}

/**
 * Renders form controls for a step's schema_json against the server-authoritative
 * shape from onboarding.validation.js: { fields: [{ key, type, required }] }.
 * `label`/`options`/`inputType`/etc are optional, non-validated presentation hints —
 * absent ones fall back to a humanized key + a type-inferred input.
 */
export function OnboardingStepForm({
  schema,
  draft,
  onChange,
  showRequiredErrors,
}: {
  schema: OnboardingStepSchema;
  draft: OnboardingDraft;
  onChange: (key: string, value: unknown) => void;
  /** Show "required" inline errors for empty required fields (set once the user attempts Continue). */
  showRequiredErrors?: boolean;
}) {
  const fields = schema?.fields ?? [];
  if (fields.length === 0) {
    return <p className="text-sm text-ink-400">This step has no additional fields — continue when you&apos;re ready.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
      {fields.map((field) => {
        const kind = resolveInputKind(field);
        const label = field.label ?? humanizeFieldKey(field.key);
        const value = draft[field.key];
        const missing = Boolean(showRequiredErrors && field.required && (value === undefined || value === null || value === ''));
        const wrapperClass = isFullWidth(field, kind) ? 'md:col-span-2' : '';

        if (kind === 'checkbox') {
          return (
            <div key={field.key} className={wrapperClass}>
              <label className="flex items-center gap-2.5 rounded-control border border-ink-200 px-3.5 py-2.5 text-sm text-ink-800 dark:border-ink-700 dark:text-ink-100">
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={(e) => onChange(field.key, e.target.checked)}
                  className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500/40"
                />
                {label}
                {field.required && <span className="text-red-500">*</span>}
              </label>
              {field.help && <p className="mt-1 text-xs text-ink-400">{field.help}</p>}
            </div>
          );
        }

        return (
          <div key={field.key} className={wrapperClass}>
            <label className="mb-1.5 block text-sm font-semibold text-ink-800 dark:text-ink-100">
              {label}
              {field.required && <span className="ml-0.5 text-red-500">*</span>}
            </label>

            {kind === 'select' && (
              <select
                value={typeof value === 'string' ? value : ''}
                onChange={(e) => onChange(field.key, e.target.value)}
                className="h-10 w-full rounded-control border border-ink-200 bg-white px-3 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
              >
                <option value="">Select…</option>
                {(field.options ?? []).map((opt) => {
                  const o = optionValue(opt);
                  return (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  );
                })}
              </select>
            )}

            {kind === 'textarea' && (
              <textarea
                value={typeof value === 'string' ? value : ''}
                onChange={(e) => onChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                rows={4}
                className="w-full rounded-control border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
              />
            )}

            {kind === 'tags' && (
              <TagsInput
                value={Array.isArray(value) ? (value as string[]) : []}
                onChange={(next) => onChange(field.key, next)}
                placeholder={field.placeholder ?? 'Type and press Enter to add'}
              />
            )}

            {kind === 'number' && (
              <Input
                type="number"
                value={typeof value === 'number' ? value : ''}
                onChange={(e) => onChange(field.key, e.target.value === '' ? undefined : Number(e.target.value))}
                placeholder={field.placeholder}
              />
            )}

            {(kind === 'text' || kind === 'email' || kind === 'url' || kind === 'date') && (
              <Input
                type={kind === 'date' ? 'date' : kind === 'email' ? 'email' : kind === 'url' ? 'url' : 'text'}
                value={typeof value === 'string' ? value : ''}
                onChange={(e) => onChange(field.key, e.target.value)}
                placeholder={field.placeholder}
              />
            )}

            {field.help && <p className="mt-1 text-xs text-ink-400">{field.help}</p>}
            {missing && <p className="mt-1 text-xs font-medium text-red-600">This field is required.</p>}
          </div>
        );
      })}
    </div>
  );
}

function TagsInput({ value, onChange, placeholder }: { value: string[]; onChange: (next: string[]) => void; placeholder?: string }) {
  function addFromInput(raw: string) {
    const parts = raw
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const next = Array.from(new Set([...value, ...parts]));
    onChange(next);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-400"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              className="rounded-full hover:bg-brand-100 dark:hover:bg-brand-500/25"
              aria-label={`Remove ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        placeholder={placeholder}
        className="mt-1.5 h-10 w-full rounded-control border border-ink-200 bg-white px-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addFromInput((e.target as HTMLInputElement).value);
            (e.target as HTMLInputElement).value = '';
          }
        }}
        onBlur={(e) => {
          addFromInput(e.target.value);
          e.target.value = '';
        }}
      />
    </div>
  );
}
