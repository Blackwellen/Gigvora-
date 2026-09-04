'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';

type ModelRow = {
  id: string;
  model_name: string;
  capability: string | null;
  domain: string | null;
  owner_team: string | null;
  risk_classification: string;
  status: string;
  description: string | null;
  champion_version: string | null;
  champion_stage: string | null;
  champion_metric_value: number | null;
};

const STATUS_TONE: Record<string, 'brand' | 'neutral' | 'success' | 'warning' | 'danger'> = {
  active: 'success',
  shadow: 'neutral',
  retired: 'neutral',
};

const RISK_TONE: Record<string, 'brand' | 'neutral' | 'success' | 'warning' | 'danger'> = {
  low: 'neutral',
  medium: 'brand',
  high: 'warning',
  restricted: 'danger',
};

/**
 * Shared table used by 26.02 Matching, 26.03 Ranking and 26.04 Recommendations — all three are
 * simply model_registry filtered by a capability prefix (spec §2's shared-platform principle:
 * one matching/ranking/recommendation engine with per-capability config, not per-domain
 * duplicate services), so one component renders the real data for each.
 */
export function ModelFamilyView({ capabilityPrefix, emptyHint }: { capabilityPrefix: string; emptyHint: string }) {
  const [rows, setRows] = useState<ModelRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<{ data: ModelRow[] }>('/intelligence/models', { params: { capabilityPrefix } });
      setRows(res.data.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load models.'));
    }
  }, [capabilityPrefix]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <div className="rounded-panel border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>;

  if (!rows) {
    return (
      <div className="flex items-center justify-center rounded-panel border border-ink-100 bg-white py-16 shadow-surface">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-panel border border-dashed border-ink-200 bg-white px-8 py-14 text-center shadow-surface">
        <h2 className="text-base font-bold text-ink-900">No models registered</h2>
        <p className="mt-1.5 max-w-sm text-sm text-ink-500">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-panel border border-ink-100 bg-white shadow-surface">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
            <th className="px-4 py-2.5 font-semibold">Model</th>
            <th className="px-4 py-2.5 font-semibold">Domain</th>
            <th className="px-4 py-2.5 font-semibold">Owner</th>
            <th className="px-4 py-2.5 font-semibold">Champion</th>
            <th className="px-4 py-2.5 font-semibold">Quality</th>
            <th className="px-4 py-2.5 font-semibold">Risk</th>
            <th className="px-4 py-2.5 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.id} className="border-b border-ink-50 last:border-0 hover:bg-ink-50/60">
              <td className="px-4 py-3">
                <Link href={`/admin/intelligence/models/${m.id}`} className="font-semibold text-ink-900 hover:text-brand-700">
                  {m.model_name}
                </Link>
                <p className="text-xs text-ink-400">{m.capability}</p>
              </td>
              <td className="px-4 py-3 text-ink-600">{m.domain || '—'}</td>
              <td className="px-4 py-3 text-ink-600">{m.owner_team || '—'}</td>
              <td className="px-4 py-3 text-ink-600">
                {m.champion_version || '—'}
                {m.champion_stage && <span className="ml-1 text-xs text-ink-400">({m.champion_stage})</span>}
              </td>
              <td className="px-4 py-3 text-ink-600">{m.champion_metric_value != null ? m.champion_metric_value : '—'}</td>
              <td className="px-4 py-3">
                <Badge tone={RISK_TONE[m.risk_classification] || 'neutral'}>{m.risk_classification}</Badge>
              </td>
              <td className="px-4 py-3">
                <Badge tone={STATUS_TONE[m.status] || 'neutral'}>{m.status}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
