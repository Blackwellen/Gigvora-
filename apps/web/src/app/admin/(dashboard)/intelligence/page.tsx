'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, AlertTriangle, Cpu, Gauge, Loader2, Sparkles } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { Badge } from '@/components/ui/Badge';

type ModelHealthRow = {
  id: string;
  modelName: string;
  capability: string | null;
  domain: string | null;
  status: string;
  riskClassification: string;
  productionVersion: string | null;
  stage: string | null;
  primaryMetric: { name: string; value: number } | null;
  requests24h: number;
  avgLatencyMs: number | null;
  fallbackRate: number;
};

type Overview = {
  kpis: { activeModels: number; predictionsToday: number; p95LatencyMs: number | null; alertsOpen: number; rollbacksTotal: number };
  modelHealth: ModelHealthRow[];
  recentActivity: { id: string; event_type: string; model_name: string; created_at: string; reason: string | null }[];
  alerts: { id: string; title: string; severity: string; description: string | null }[];
  featureFreshness: Record<string, number>;
};

const SEVERITY_TONE: Record<string, 'brand' | 'neutral' | 'success' | 'warning' | 'danger'> = {
  info: 'neutral',
  low: 'brand',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
};

const STATUS_TONE: Record<string, 'brand' | 'neutral' | 'success' | 'warning' | 'danger'> = {
  active: 'success',
  shadow: 'neutral',
  retired: 'neutral',
};

export default function IntelligenceOverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<{ data: Overview }>('/intelligence/overview');
      setData(res.data.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load the ML intelligence overview.'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return <div className="rounded-panel border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>;
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center rounded-panel border border-ink-100 bg-white py-16 shadow-surface">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" aria-hidden />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <KpiGrid className="lg:grid-cols-5">
        <KpiCard label="Active models" value={data.kpis.activeModels} icon={Cpu} tone="brand" />
        <KpiCard label="Predictions today" value={data.kpis.predictionsToday.toLocaleString()} icon={Activity} />
        <KpiCard label="p95 inference latency" value={data.kpis.p95LatencyMs != null ? `${data.kpis.p95LatencyMs}ms` : '—'} icon={Gauge} />
        <KpiCard label="Open alerts" value={data.kpis.alertsOpen} icon={AlertTriangle} tone={data.kpis.alertsOpen > 0 ? 'warning' : 'default'} />
        <KpiCard label="Rollbacks (all time)" value={data.kpis.rollbacksTotal} tone={data.kpis.rollbacksTotal > 0 ? 'danger' : 'default'} />
      </KpiGrid>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section className="rounded-panel border border-ink-100 bg-white shadow-surface">
            <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
              <h2 className="font-display text-sm font-bold text-ink-900">Model health</h2>
              <Link href="/admin/intelligence/registry" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                View registry
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
                    <th className="px-4 py-2 font-semibold">Capability</th>
                    <th className="px-4 py-2 font-semibold">Version</th>
                    <th className="px-4 py-2 font-semibold">Requests (24h)</th>
                    <th className="px-4 py-2 font-semibold">Latency</th>
                    <th className="px-4 py-2 font-semibold">Quality</th>
                    <th className="px-4 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.modelHealth.map((m) => (
                    <tr key={m.id} className="border-b border-ink-50 last:border-0 hover:bg-ink-50/60">
                      <td className="px-4 py-2.5">
                        <Link href={`/admin/intelligence/models/${m.id}`} className="font-semibold text-ink-900 hover:text-brand-700">
                          {m.modelName}
                        </Link>
                        <p className="text-xs text-ink-400">{m.capability}</p>
                      </td>
                      <td className="px-4 py-2.5 text-ink-600">{m.productionVersion || '—'}</td>
                      <td className="px-4 py-2.5 text-ink-600">{m.requests24h.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-ink-600">{m.avgLatencyMs != null ? `${m.avgLatencyMs}ms` : '—'}</td>
                      <td className="px-4 py-2.5 text-ink-600">
                        {m.primaryMetric ? `${m.primaryMetric.name} ${m.primaryMetric.value}` : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone={STATUS_TONE[m.status] || 'neutral'}>{m.status}</Badge>
                      </td>
                    </tr>
                  ))}
                  {data.modelHealth.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-400">
                        No models registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-panel border border-ink-100 bg-white shadow-surface">
            <div className="border-b border-ink-100 px-4 py-3">
              <h2 className="font-display text-sm font-bold text-ink-900">Recent model activity</h2>
            </div>
            <ul className="divide-y divide-ink-50">
              {data.recentActivity.map((e) => (
                <li key={e.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div>
                    <span className="font-semibold text-ink-800">{e.model_name}</span>{' '}
                    <span className="text-ink-500">{e.event_type.replaceAll('_', ' ')}</span>
                    {e.reason && <span className="text-ink-400"> — {e.reason}</span>}
                  </div>
                  <span className="whitespace-nowrap text-xs text-ink-400">{new Date(e.created_at).toLocaleString()}</span>
                </li>
              ))}
              {data.recentActivity.length === 0 && <li className="px-4 py-8 text-center text-sm text-ink-400">No activity yet.</li>}
            </ul>
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-panel border border-ink-100 bg-white shadow-surface">
            <div className="flex items-center gap-2 border-b border-ink-100 px-4 py-3">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <h2 className="font-display text-sm font-bold text-ink-900">Intelligence alerts</h2>
            </div>
            <ul className="divide-y divide-ink-50">
              {data.alerts.map((a) => (
                <li key={a.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink-800">{a.title}</p>
                    <Badge tone={SEVERITY_TONE[a.severity] || 'neutral'}>{a.severity}</Badge>
                  </div>
                  {a.description && <p className="mt-1 text-xs text-ink-500">{a.description}</p>}
                </li>
              ))}
              {data.alerts.length === 0 && <li className="px-4 py-8 text-center text-sm text-ink-400">No open alerts.</li>}
            </ul>
          </section>

          <section className="rounded-panel border border-ink-100 bg-white p-4 shadow-surface">
            <h2 className="mb-3 font-display text-sm font-bold text-ink-900">Feature freshness</h2>
            <div className="space-y-2 text-sm">
              {Object.entries(data.featureFreshness).length === 0 && <p className="text-ink-400">No features registered yet.</p>}
              {Object.entries(data.featureFreshness).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="capitalize text-ink-600">{status}</span>
                  <span className="font-semibold text-ink-900">{count}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
