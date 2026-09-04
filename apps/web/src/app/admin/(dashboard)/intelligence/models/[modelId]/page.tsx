'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, RotateCcw, Rocket } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';

type Version = {
  id: string;
  version: string;
  stage: string;
  framework: string | null;
  primary_metric_name: string | null;
  primary_metric_value: string | null;
  created_at: string;
};

type ModelDetail = {
  id: string;
  model_name: string;
  capability: string | null;
  domain: string | null;
  owner_team: string | null;
  risk_classification: string;
  status: string;
  description: string | null;
  champion_version_id: string | null;
  versions: Version[];
  features: { id: string; feature_key: string; display_name: string; status: string }[];
  evaluations: { id: string; version: string; evaluation_type: string; decision: string; metrics: Record<string, number>; created_at: string }[];
  deploymentHistory: { id: string; event_type: string; traffic_percent: string | null; reason: string | null; environment: string; created_at: string }[];
  experiments: { id: string; name: string; status: string; primary_metric: string }[];
  alerts: { id: string; title: string; severity: string }[];
};

const STAGE_TONE: Record<string, 'brand' | 'neutral' | 'success' | 'warning' | 'danger'> = {
  draft: 'neutral',
  training: 'neutral',
  evaluating: 'brand',
  candidate: 'brand',
  approved: 'brand',
  staging: 'warning',
  production: 'success',
  deprecated: 'neutral',
  archived: 'neutral',
  failed: 'danger',
};

/**
 * 26.15 model detail — the shared "technical detail drawer" content promoted to a full page
 * (deep-linked from every family table). Promotion/rollback require explicit reason + are
 * server-validated (promoteVersion / rollback in intelligence.service.js) — no silent production
 * replacement from this UI.
 */
export default function ModelDetailPage() {
  const params = useParams<{ modelId: string }>();
  const router = useRouter();
  const [data, setData] = useState<ModelDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<{ data: ModelDetail }>(`/intelligence/models/${params.modelId}`);
      setData(res.data.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load this model.'));
    }
  }, [params.modelId]);

  useEffect(() => {
    load();
  }, [load]);

  async function promote(versionId: string) {
    const reason = window.prompt('Reason for promoting this version to production?');
    if (!reason) return;
    setActioning(versionId);
    try {
      await api.post(`/intelligence/models/${params.modelId}/versions/${versionId}/promote`, { targetStage: 'production', trafficPercent: 100, reason });
      load();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Promotion failed.'));
    } finally {
      setActioning(null);
    }
  }

  async function rollback(versionId: string) {
    const reason = window.prompt('Reason for rolling back to this version?');
    if (!reason) return;
    setActioning(versionId);
    try {
      await api.post(`/intelligence/models/${params.modelId}/rollback`, { targetVersionId: versionId, reason });
      load();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Rollback failed.'));
    } finally {
      setActioning(null);
    }
  }

  if (error) return <div className="rounded-panel border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>;
  if (!data) {
    return (
      <div className="flex items-center justify-center rounded-panel border border-ink-100 bg-white py-16 shadow-surface">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <button type="button" onClick={() => router.back()} className="flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-ink-800">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      <div className="rounded-panel border border-ink-100 bg-white p-4 shadow-surface">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-ink-900">{data.model_name}</h2>
            <p className="text-sm text-ink-500">{data.description}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <Badge tone="neutral">{data.capability}</Badge>
              <Badge tone="neutral">{data.domain}</Badge>
              <Badge tone={data.risk_classification === 'restricted' || data.risk_classification === 'high' ? 'danger' : 'neutral'}>
                risk: {data.risk_classification}
              </Badge>
              <Badge tone={data.status === 'active' ? 'success' : 'neutral'}>{data.status}</Badge>
            </div>
          </div>
          <p className="text-xs text-ink-400">Owner: {data.owner_team || '—'}</p>
        </div>
      </div>

      {data.alerts.length > 0 && (
        <div className="rounded-panel border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {data.alerts.map((a) => (
            <p key={a.id}>⚠ {a.title}</p>
          ))}
        </div>
      )}

      <section className="rounded-panel border border-ink-100 bg-white shadow-surface">
        <div className="border-b border-ink-100 px-4 py-3">
          <h3 className="font-display text-sm font-bold text-ink-900">Versions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
                <th className="px-4 py-2 font-semibold">Version</th>
                <th className="px-4 py-2 font-semibold">Stage</th>
                <th className="px-4 py-2 font-semibold">Framework</th>
                <th className="px-4 py-2 font-semibold">Metric</th>
                <th className="px-4 py-2 font-semibold">Created</th>
                <th className="px-4 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.versions.map((v) => (
                <tr key={v.id} className="border-b border-ink-50 last:border-0">
                  <td className="px-4 py-2.5 font-semibold text-ink-800">
                    {v.version} {v.id === data.champion_version_id && <span className="ml-1 text-xs text-brand-600">(champion)</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tone={STAGE_TONE[v.stage] || 'neutral'}>{v.stage}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-ink-600">{v.framework || '—'}</td>
                  <td className="px-4 py-2.5 text-ink-600">{v.primary_metric_name ? `${v.primary_metric_name}: ${v.primary_metric_value}` : '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-ink-400">{new Date(v.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5">
                    {v.stage !== 'production' && v.id !== data.champion_version_id && (
                      <button
                        type="button"
                        disabled={actioning === v.id}
                        onClick={() => promote(v.id)}
                        className="flex items-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                      >
                        <Rocket className="h-3 w-3" /> Promote
                      </button>
                    )}
                    {v.stage === 'production' && v.id !== data.champion_version_id && (
                      <button
                        type="button"
                        disabled={actioning === v.id}
                        onClick={() => rollback(v.id)}
                        className="flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        <RotateCcw className="h-3 w-3" /> Roll back to this
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {data.versions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-ink-400">
                    No versions registered.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="rounded-panel border border-ink-100 bg-white shadow-surface">
          <div className="border-b border-ink-100 px-4 py-3">
            <h3 className="font-display text-sm font-bold text-ink-900">Features</h3>
          </div>
          <ul className="divide-y divide-ink-50">
            {data.features.map((f) => (
              <li key={f.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="text-ink-700">{f.feature_key}</span>
                <Badge tone={f.status === 'healthy' ? 'success' : 'warning'}>{f.status}</Badge>
              </li>
            ))}
            {data.features.length === 0 && <li className="px-4 py-6 text-center text-sm text-ink-400">No feature dependencies recorded.</li>}
          </ul>
        </section>

        <section className="rounded-panel border border-ink-100 bg-white shadow-surface">
          <div className="border-b border-ink-100 px-4 py-3">
            <h3 className="font-display text-sm font-bold text-ink-900">Evaluations</h3>
          </div>
          <ul className="divide-y divide-ink-50">
            {data.evaluations.map((e) => (
              <li key={e.id} className="px-4 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-ink-700">
                    {e.version} · {e.evaluation_type}
                  </span>
                  <Badge tone={e.decision === 'pass' ? 'success' : e.decision === 'warning' ? 'warning' : 'danger'}>{e.decision}</Badge>
                </div>
              </li>
            ))}
            {data.evaluations.length === 0 && <li className="px-4 py-6 text-center text-sm text-ink-400">No evaluations have been run.</li>}
          </ul>
        </section>
      </div>

      <section className="rounded-panel border border-ink-100 bg-white shadow-surface">
        <div className="border-b border-ink-100 px-4 py-3">
          <h3 className="font-display text-sm font-bold text-ink-900">Deployment history &amp; audit</h3>
        </div>
        <ul className="divide-y divide-ink-50">
          {data.deploymentHistory.map((e) => (
            <li key={e.id} className="flex items-center justify-between px-4 py-2 text-sm">
              <span className="text-ink-700">
                {e.event_type.replaceAll('_', ' ')} {e.traffic_percent ? `(${e.traffic_percent}% traffic)` : ''} {e.reason ? `— ${e.reason}` : ''}
              </span>
              <span className="whitespace-nowrap text-xs text-ink-400">{new Date(e.created_at).toLocaleString()}</span>
            </li>
          ))}
          {data.deploymentHistory.length === 0 && <li className="px-4 py-6 text-center text-sm text-ink-400">No deployment events yet.</li>}
        </ul>
      </section>
    </div>
  );
}
