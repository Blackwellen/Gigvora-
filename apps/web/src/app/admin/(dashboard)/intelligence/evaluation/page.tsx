'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';

type EvalRow = {
  id: string;
  model_registry_id: string;
  model_name: string;
  version: string;
  evaluation_type: string;
  metrics: Record<string, number>;
  decision: 'pass' | 'warning' | 'fail';
  owner: string | null;
  created_at: string;
};

const DECISION_TONE: Record<string, 'success' | 'warning' | 'danger'> = { pass: 'success', warning: 'warning', fail: 'danger' };

export default function ModelEvaluationPage() {
  const [rows, setRows] = useState<EvalRow[] | null>(null);
  const [decision, setDecision] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<{ data: EvalRow[] }>('/intelligence/evaluations', { params: decision ? { decision } : {} });
      setRows(res.data.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load evaluations.'));
    }
  }, [decision]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-ink-900">Model evaluation</h2>
          <p className="text-sm text-ink-500">Offline evaluation runs that gate production promotion — see each model&apos;s detail page to promote or roll back.</p>
        </div>
        <select value={decision} onChange={(e) => setDecision(e.target.value)} className="rounded-control border border-ink-200 px-3 py-1.5 text-sm">
          <option value="">All decisions</option>
          <option value="pass">Pass</option>
          <option value="warning">Warning</option>
          <option value="fail">Fail</option>
        </select>
      </div>

      {error && <div className="rounded-panel border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {!rows && !error && (
        <div className="flex items-center justify-center rounded-panel border border-ink-100 bg-white py-16 shadow-surface">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {rows && (
        <div className="overflow-x-auto rounded-panel border border-ink-100 bg-white shadow-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
                <th className="px-4 py-2.5 font-semibold">Model</th>
                <th className="px-4 py-2.5 font-semibold">Type</th>
                <th className="px-4 py-2.5 font-semibold">Metrics</th>
                <th className="px-4 py-2.5 font-semibold">Owner</th>
                <th className="px-4 py-2.5 font-semibold">Decision</th>
                <th className="px-4 py-2.5 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="border-b border-ink-50 last:border-0">
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/intelligence/models/${e.model_registry_id}`} className="font-semibold text-ink-800 hover:text-brand-700">
                      {e.model_name}
                    </Link>
                    <p className="text-xs text-ink-400">{e.version}</p>
                  </td>
                  <td className="px-4 py-2.5 text-ink-600">{e.evaluation_type}</td>
                  <td className="px-4 py-2.5 text-xs text-ink-600">
                    {Object.entries(e.metrics || {})
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(', ')}
                  </td>
                  <td className="px-4 py-2.5 text-ink-600">{e.owner || '—'}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={DECISION_TONE[e.decision]}>{e.decision}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-ink-400">{new Date(e.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-400">
                    No evaluations have been run yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
