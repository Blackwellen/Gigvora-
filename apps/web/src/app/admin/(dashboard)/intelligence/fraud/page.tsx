'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';

type FraudData = {
  models: { id: string; model_name: string; status: string; risk_classification: string }[];
  decisions: {
    id: string;
    subject_type: string;
    subject_id: string;
    risk_score: string;
    risk_band: string;
    reason_codes: string[];
    decision: string;
    created_at: string;
  }[];
  bandCounts: Record<string, number>;
};

const BAND_TONE: Record<string, 'brand' | 'neutral' | 'success' | 'warning' | 'danger'> = {
  low: 'success',
  observe: 'brand',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
};

const DECISION_LABEL: Record<string, string> = {
  allow: 'Allowed',
  step_up_verification: 'Step-up verification',
  rate_limit: 'Rate limited',
  manual_review: 'Manual review',
  temporary_restriction: 'Temporary restriction',
  deny: 'Denied',
};

/**
 * Fraud/risk model operations (26.12). Scores here feed policy-driven review outcomes
 * (allow / step-up / rate-limit / manual review / restrict / deny) — never an automatic ban, per
 * ml_fraud_decisions.decision. Restricted to platform admins (route-gated by the /admin shell).
 */
export default function FraudModelsPage() {
  const [data, setData] = useState<FraudData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<{ data: FraudData }>('/intelligence/fraud');
      setData(res.data.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load fraud model data.'));
    }
  }, []);

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

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-red-600" />
        <div>
          <h2 className="font-display text-lg font-bold text-ink-900">Fraud &amp; risk models</h2>
          <p className="text-sm text-ink-500">Risk signals feed policy review — a model score is never an automatic account decision.</p>
        </div>
      </div>

      <KpiGrid className="lg:grid-cols-5">
        {(['low', 'observe', 'medium', 'high', 'critical'] as const).map((band) => (
          <KpiCard key={band} label={band} value={data.bandCounts[band] || 0} tone={band === 'high' || band === 'critical' ? 'danger' : band === 'medium' ? 'warning' : 'default'} />
        ))}
      </KpiGrid>

      <section className="rounded-panel border border-ink-100 bg-white shadow-surface">
        <div className="border-b border-ink-100 px-4 py-3">
          <h3 className="font-display text-sm font-bold text-ink-900">Registered models</h3>
        </div>
        <ul className="divide-y divide-ink-50">
          {data.models.map((m) => (
            <li key={m.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="font-semibold text-ink-800">{m.model_name}</span>
              <Badge tone={m.status === 'active' ? 'success' : 'neutral'}>{m.status}</Badge>
            </li>
          ))}
          {data.models.length === 0 && <li className="px-4 py-8 text-center text-sm text-ink-400">No fraud models registered yet.</li>}
        </ul>
      </section>

      <section className="rounded-panel border border-ink-100 bg-white shadow-surface">
        <div className="border-b border-ink-100 px-4 py-3">
          <h3 className="font-display text-sm font-bold text-ink-900">Recent risk decisions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
                <th className="px-4 py-2 font-semibold">Subject</th>
                <th className="px-4 py-2 font-semibold">Risk score</th>
                <th className="px-4 py-2 font-semibold">Band</th>
                <th className="px-4 py-2 font-semibold">Reason codes</th>
                <th className="px-4 py-2 font-semibold">Decision</th>
                <th className="px-4 py-2 font-semibold">When</th>
              </tr>
            </thead>
            <tbody>
              {data.decisions.map((d) => (
                <tr key={d.id} className="border-b border-ink-50 last:border-0">
                  <td className="px-4 py-2.5 text-ink-600">{d.subject_type}</td>
                  <td className="px-4 py-2.5 text-ink-600">{Number(d.risk_score).toFixed(2)}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={BAND_TONE[d.risk_band] || 'neutral'}>{d.risk_band}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-ink-500">{(d.reason_codes || []).join(', ')}</td>
                  <td className="px-4 py-2.5 text-ink-600">{DECISION_LABEL[d.decision] || d.decision}</td>
                  <td className="px-4 py-2.5 text-xs text-ink-400">{new Date(d.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {data.decisions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-400">
                    No risk decisions recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
