'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';

type Model = { id: string; model_name: string; status: string; capability: string | null };
type Overview = { models: Model[]; source: string; [key: string]: unknown };

/**
 * Shared shell for 26.09/26.10/26.11 — lead/candidate/opportunity scoring. These pages are
 * deliberately an OPERATIONAL VIEW onto scores already computed by their owning domain tables
 * (crm_ml_predictions, candidate_match_scores, pm_ml_predictions), not a rival scoring engine —
 * the recordsKey prop names which array in the response holds the recent records to render.
 */
export function ScoringOverview({ endpoint, recordsKey, title, description }: { endpoint: string; recordsKey: string; title: string; description: string }) {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<{ data: Overview }>(endpoint);
      setData(res.data.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load scoring data.'));
    }
  }, [endpoint]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <div className="rounded-panel border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>;
  if (!data) {
    return (
      <div className="flex items-center justify-center rounded-panel border border-ink-100 bg-white py-16 shadow-surface">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  const records = (data[recordsKey] as Record<string, unknown>[]) || [];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold text-ink-900">{title}</h2>
        <p className="text-sm text-ink-500">{description}</p>
      </div>

      <section className="rounded-panel border border-ink-100 bg-white shadow-surface">
        <div className="border-b border-ink-100 px-4 py-3">
          <h3 className="font-display text-sm font-bold text-ink-900">Production models</h3>
        </div>
        <ul className="divide-y divide-ink-50">
          {data.models.map((m) => (
            <li key={m.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <div>
                <Link href={`/admin/intelligence/models/${m.id}`} className="font-semibold text-ink-800 hover:text-brand-700">
                  {m.model_name}
                </Link>
                <span className="ml-2 text-xs text-ink-400">{m.capability}</span>
              </div>
              <Badge tone={m.status === 'active' ? 'success' : 'neutral'}>{m.status}</Badge>
            </li>
          ))}
          {data.models.length === 0 && <li className="px-4 py-8 text-center text-sm text-ink-400">No models registered for this capability yet.</li>}
        </ul>
      </section>

      <section className="rounded-panel border border-ink-100 bg-white shadow-surface">
        <div className="border-b border-ink-100 px-4 py-3">
          <h3 className="font-display text-sm font-bold text-ink-900">Recent records</h3>
          <p className="text-xs text-ink-400">Source: {data.source}</p>
        </div>
        <div className="overflow-x-auto">
          {records.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-ink-400">No scored records yet.</p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-ink-100 uppercase tracking-wide text-ink-400">
                  {Object.keys(records[0])
                    .slice(0, 6)
                    .map((k) => (
                      <th key={k} className="px-4 py-2 font-semibold">
                        {k}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {records.slice(0, 20).map((r, i) => (
                  <tr key={i} className="border-b border-ink-50 last:border-0">
                    {Object.keys(records[0])
                      .slice(0, 6)
                      .map((k) => (
                        <td key={k} className="px-4 py-2 text-ink-600">
                          {String(r[k] ?? '—')}
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
