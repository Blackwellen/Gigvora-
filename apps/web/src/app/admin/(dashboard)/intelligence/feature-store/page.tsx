'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';

type Feature = {
  id: string;
  feature_key: string;
  display_name: string;
  entity_type: string;
  data_type: string;
  status: string;
  online_available: boolean;
  offline_available: boolean;
  freshness_sla_minutes: number;
  null_rate: string | null;
  consumerCount: number;
  lifecycle: string;
};

const STATUS_TONE: Record<string, 'brand' | 'neutral' | 'success' | 'warning' | 'danger'> = {
  healthy: 'success',
  delayed: 'warning',
  stale: 'warning',
  broken: 'danger',
  unknown: 'neutral',
};

export default function FeatureStorePage() {
  const [rows, setRows] = useState<Feature[] | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<{ data: Feature[] }>('/intelligence/features', { params: search ? { search } : {} });
      setRows(res.data.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load the feature store.'));
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = (rows || []).reduce<Record<string, number>>((acc, f) => ({ ...acc, [f.status]: (acc[f.status] || 0) + 1 }), {});

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-ink-900">Feature store</h2>
          <p className="text-sm text-ink-500">Discoverable, versioned features consumed by production models — see each row&apos;s consumer count before deprecating.</p>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search features…"
          className="rounded-control border border-ink-200 px-3 py-1.5 text-sm outline-none focus:border-brand-400"
        />
      </div>

      <KpiGrid className="lg:grid-cols-5">
        <KpiCard label="Registered" value={rows?.length ?? '—'} />
        <KpiCard label="Healthy" value={counts.healthy || 0} tone="success" />
        <KpiCard label="Delayed" value={counts.delayed || 0} tone="warning" />
        <KpiCard label="Stale" value={counts.stale || 0} tone="warning" />
        <KpiCard label="Broken" value={counts.broken || 0} tone="danger" />
      </KpiGrid>

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
                <th className="px-4 py-2.5 font-semibold">Feature</th>
                <th className="px-4 py-2.5 font-semibold">Entity</th>
                <th className="px-4 py-2.5 font-semibold">Type</th>
                <th className="px-4 py-2.5 font-semibold">Online</th>
                <th className="px-4 py-2.5 font-semibold">Freshness SLA</th>
                <th className="px-4 py-2.5 font-semibold">Consumers</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((f) => (
                <tr key={f.id} className="border-b border-ink-50 last:border-0">
                  <td className="px-4 py-2.5">
                    <p className="font-semibold text-ink-800">{f.feature_key}</p>
                    <p className="text-xs text-ink-400">{f.display_name}</p>
                  </td>
                  <td className="px-4 py-2.5 text-ink-600">{f.entity_type}</td>
                  <td className="px-4 py-2.5 text-ink-600">{f.data_type}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={f.online_available ? 'success' : 'neutral'}>{f.online_available ? 'Yes' : 'Offline only'}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-ink-600">{f.freshness_sla_minutes}m</td>
                  <td className="px-4 py-2.5 text-ink-600">{f.consumerCount}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={STATUS_TONE[f.status] || 'neutral'}>{f.status}</Badge>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-400">
                    No features match these filters.
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
