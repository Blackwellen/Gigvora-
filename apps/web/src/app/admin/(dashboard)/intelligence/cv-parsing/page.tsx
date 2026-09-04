'use client';

import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';

type ParseResult = {
  confidence: number;
  personalInformation: { email: { value: string; confidence: number } | null; phone: { value: string; confidence: number } | null };
  detectedSections: string[];
  warnings: string[];
  parserVersion: string;
};

const SAMPLE = `Jane Doe
jane.doe@example.com
+44 7700 900123

Summary
Product leader with 8 years experience in enterprise SaaS.

Experience
Senior Product Manager, Acme Inc, 2021-Present

Education
BSc Computer Science, University of Leeds

Skills
Product Strategy, SQL, Roadmapping`;

/**
 * 26.07 — sandbox test console. No trained NLP parser exists in this codebase yet (confirmed
 * against apps/api and apps/ml-service), so this runs the honest regex/section-detection
 * baseline in intelligence.service.js and clearly labels its confidence + gaps rather than
 * pretending to have full structured extraction.
 */
export default function CvParsingPage() {
  const [text, setText] = useState(SAMPLE);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ data: ParseResult }>('/intelligence/cv/parse-test', { text });
      setResult(res.data.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'CV parse test failed.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold text-ink-900">CV parsing</h2>
        <p className="text-sm text-ink-500">
          Sandbox test console for the CV parsing pipeline. Test operations here never write to real user profiles.
        </p>
      </div>

      {error && <div className="rounded-panel border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="rounded-panel border border-ink-100 bg-white p-4 shadow-surface">
          <h3 className="mb-2 flex items-center gap-1.5 font-display text-sm font-bold text-ink-900">
            <FileText className="h-4 w-4 text-ink-400" /> Source text
          </h3>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={16}
            className="w-full rounded-control border border-ink-200 p-3 font-mono text-xs outline-none focus:border-brand-400"
          />
          <button
            type="button"
            onClick={run}
            disabled={loading || !text.trim()}
            className="mt-3 flex items-center gap-1.5 rounded-control bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Parse test document
          </button>
        </section>

        <section className="rounded-panel border border-ink-100 bg-white p-4 shadow-surface">
          <h3 className="mb-2 font-display text-sm font-bold text-ink-900">Structured output</h3>
          {!result && <p className="text-sm text-ink-400">Run a parse test to see structured output.</p>}
          {result && (
            <div className="space-y-3 text-sm">
              <p className="text-xs font-semibold text-ink-400">Overall confidence: {(result.confidence * 100).toFixed(0)}%</p>
              <div>
                <p className="font-semibold text-ink-800">Personal information</p>
                <p className="text-ink-600">Email: {result.personalInformation.email?.value || <span className="text-ink-300">not detected</span>}</p>
                <p className="text-ink-600">Phone: {result.personalInformation.phone?.value || <span className="text-ink-300">not detected</span>}</p>
              </div>
              <div>
                <p className="font-semibold text-ink-800">Detected sections</p>
                <p className="text-ink-600">{result.detectedSections.join(', ') || 'None detected'}</p>
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
