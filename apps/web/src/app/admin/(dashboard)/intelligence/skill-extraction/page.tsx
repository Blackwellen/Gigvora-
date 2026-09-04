'use client';

import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';

type Match = {
  canonicalSkillId: string;
  canonicalName: string;
  slug: string;
  category: string | null;
  confidence: number;
  evidenceSpan: string;
  method: string;
};

type ExtractResult = { input: string; matches: Match[]; note: string | null };

const SAMPLE = 'Led product strategy for enterprise SaaS using SQL, Python and stakeholder management, with hands-on Kubernetes experience.';

/**
 * 26.06 — a real operating tool, not documentation: runs the deterministic taxonomy-matching
 * baseline against the existing `skills` table (no invented skills — unmatched phrases are
 * simply not returned, per the "never fabricate" requirement).
 */
export default function SkillExtractionPage() {
  const [text, setText] = useState(SAMPLE);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ data: ExtractResult }>('/intelligence/skills/extract-test', { text });
      setResult(res.data.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Skill extraction failed.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold text-ink-900">Skill extraction</h2>
        <p className="text-sm text-ink-500">Test canonical skill matching against Gigvora&apos;s skill taxonomy.</p>
      </div>

      {error && <div className="rounded-panel border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="rounded-panel border border-ink-100 bg-white p-4 shadow-surface">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          className="w-full rounded-control border border-ink-200 p-3 text-sm outline-none focus:border-brand-400"
          placeholder="Paste CV, job description or profile text…"
        />
        <button
          type="button"
          onClick={run}
          disabled={loading || !text.trim()}
          className="mt-3 flex items-center gap-1.5 rounded-control bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Extract skills
        </button>
      </section>

      {result && (
        <section className="rounded-panel border border-ink-100 bg-white shadow-surface">
          <div className="border-b border-ink-100 px-4 py-3">
            <h3 className="font-display text-sm font-bold text-ink-900">Extracted skills</h3>
          </div>
          {result.note && <p className="mx-4 mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">{result.note}</p>}
          <ul className="divide-y divide-ink-50">
            {result.matches.map((m) => (
              <li key={m.canonicalSkillId} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <div>
                  <span className="font-semibold text-ink-800">{m.canonicalName}</span>
                  <span className="ml-2 text-xs text-ink-400">{m.category || 'Uncategorised'}</span>
                  <p className="text-xs text-ink-400">evidence: &ldquo;{m.evidenceSpan}&rdquo;</p>
                </div>
                <span className="text-xs font-semibold text-brand-600">{(m.confidence * 100).toFixed(0)}%</span>
              </li>
            ))}
            {result.matches.length === 0 && <li className="px-4 py-8 text-center text-sm text-ink-400">No canonical skills matched this text.</li>}
          </ul>
        </section>
      )}
    </div>
  );
}
