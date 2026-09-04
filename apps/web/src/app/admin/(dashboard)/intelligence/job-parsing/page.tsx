'use client';

import { useState } from 'react';
import { Briefcase, Loader2 } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';

type ParseResult = {
  canonicalTitle: { value: string; confidence: number } | null;
  remoteMode: { value: string; confidence: number } | null;
  salary: { currency: string; minimum: number; maximum: number; confidence: number } | null;
  requiredSkills: { value: string; confidence: number }[];
  warnings: string[];
  parserVersion: string;
};

const SAMPLE = `Senior Product Manager
We're hiring a remote Senior Product Manager to own our SaaS roadmap.
£70k-£90k DOE. Requires SQL and Python experience, plus stakeholder management.`;

export default function JobParsingPage() {
  const [text, setText] = useState(SAMPLE);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ data: ParseResult }>('/intelligence/jobs/parse-test', { text });
      setResult(res.data.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Job parse test failed.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold text-ink-900">Job parsing</h2>
        <p className="text-sm text-ink-500">Structured extraction from job descriptions — never silently rewrites a published job.</p>
      </div>

      {error && <div className="rounded-panel border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="rounded-panel border border-ink-100 bg-white p-4 shadow-surface">
          <h3 className="mb-2 flex items-center gap-1.5 font-display text-sm font-bold text-ink-900">
            <Briefcase className="h-4 w-4 text-ink-400" /> Job description
          </h3>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            className="w-full rounded-control border border-ink-200 p-3 text-xs font-mono outline-none focus:border-brand-400"
          />
          <button
            type="button"
            onClick={run}
            disabled={loading || !text.trim()}
            className="mt-3 flex items-center gap-1.5 rounded-control bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Parse test job
          </button>
        </section>

        <section className="rounded-panel border border-ink-100 bg-white p-4 shadow-surface">
          <h3 className="mb-2 font-display text-sm font-bold text-ink-900">Structured output</h3>
          {!result && <p className="text-sm text-ink-400">Run a parse test to see structured output.</p>}
          {result && (
            <div className="space-y-3 text-sm">
              <p className="text-ink-600">
                Title: <span className="font-semibold">{result.canonicalTitle?.value || 'not detected'}</span>
              </p>
              <p className="text-ink-600">
                Remote mode: <span className="font-semibold capitalize">{result.remoteMode?.value || 'not detected'}</span>
              </p>
              <p className="text-ink-600">
                Salary:{' '}
                <span className="font-semibold">
                  {result.salary ? `${result.salary.currency}${result.salary.minimum.toLocaleString()}–${result.salary.maximum.toLocaleString()}` : 'not detected'}
                </span>
              </p>
              <div>
                <p className="font-semibold text-ink-800">Required skills</p>
                <p className="text-ink-600">{result.requiredSkills.map((s) => s.value).join(', ') || 'None detected'}</p>
              </div>
              {result.warnings.length > 0 && (
                <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  {result.warnings.map((w) => (
                    <p key={w}>{w}</p>
                  ))}
                </div>
              )}
              <p className="text-xs text-ink-400">Parser version: {result.parserVersion}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
