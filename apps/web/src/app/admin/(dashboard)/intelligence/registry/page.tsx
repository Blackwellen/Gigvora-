'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Plus } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';

type ModelRow = {
  id: string;
  model_name: string;
  capability: string | null;
  domain: string | null;
  owner_team: string | null;
  status: string;
  champion_version: string | null;
  champion_stage: string | null;
  updated_at: string;
};

const STATUS_TONE: Record<string, 'brand' | 'neutral' | 'success' | 'warning' | 'danger'> = {
  active: 'success',
  shadow: 'neutral',
  retired: 'neutral',
};

/**
 * 26.15 — canonical model lifecycle control. "Register model" creates a `model_registry` row in
 * `shadow` status; promoting a version to production (from the model detail page) is a separate,
 * confirmation-gated action requiring a passing evaluation, matching the spec's "no one-click
 * unreviewed production replacement" requirement.
 */
export default function ModelRegistryPage() {
  const [rows, setRows] = useState<ModelRow[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ modelName: '', capability: '', domain: '', ownerTeam: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<{ data: ModelRow[] }>('/intelligence/models');
      setRows(res.data.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load the model registry.'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function registerModel() {
    if (!form.modelName || !form.capability) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/intelligence/models', form);
      setShowForm(false);
      setForm({ modelName: '', capability: '', domain: '', ownerTeam: '', description: '' });
      load();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not register the model.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-ink-900">Model registry</h2>
          <p className="text-sm text-ink-500">Canonical registry for every deployable model across Gigvora&apos;s intelligence platform.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 rounded-control bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" /> Register model
        </button>
      </div>

      {error && <div className="rounded-panel border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {showForm && (
        <section className="grid grid-cols-1 gap-3 rounded-panel border border-ink-100 bg-white p-4 shadow-surface sm:grid-cols-2">
          <input
            placeholder="Model name (e.g. gig-buyer-match)"
            value={form.modelName}
            onChange={(e) => setForm((f) => ({ ...f, modelName: e.target.value }))}
            className="rounded-control border border-ink-200 px-3 py-2 text-sm"
          />
          <input
            placeholder="Capability (e.g. matching.gig_buyer)"
            value={form.capability}
            onChange={(e) => setForm((f) => ({ ...f, capability: e.target.value }))}
            className="rounded-control border border-ink-200 px-3 py-2 text-sm"
          />
          <input
            placeholder="Domain (e.g. gigs)"
            value={form.domain}
            onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
            className="rounded-control border border-ink-200 px-3 py-2 text-sm"
          />
          <input
            placeholder="Owner team"
            value={form.ownerTeam}
            onChange={(e) => setForm((f) => ({ ...f, ownerTeam: e.target.value }))}
            className="rounded-control border border-ink-200 px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="rounded-control border border-ink-200 px-3 py-2 text-sm sm:col-span-2"
            rows={2}
          />
          <button
            type="button"
            onClick={registerModel}
            disabled={submitting || !form.modelName || !form.capability}
            className="rounded-control bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 sm:col-span-2 sm:w-fit"
          >
            {submitting ? 'Registering…' : 'Register'}
          </button>
        </section>
      )}

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
                <th className="px-4 py-2.5 font-semibold">Domain</th>
                <th className="px-4 py-2.5 font-semibold">Owner</th>
                <th className="px-4 py-2.5 font-semibold">Production version</th>
                <th className="px-4 py-2.5 font-semibold">Updated</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-b border-ink-50 last:border-0 hover:bg-ink-50/60">
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/intelligence/models/${m.id}`} className="font-semibold text-ink-900 hover:text-brand-700">
                      {m.model_name}
                    </Link>
                    <p className="text-xs text-ink-400">{m.capability}</p>
                  </td>
                  <td className="px-4 py-2.5 text-ink-600">{m.domain || '—'}</td>
                  <td className="px-4 py-2.5 text-ink-600">{m.owner_team || '—'}</td>
                  <td className="px-4 py-2.5 text-ink-600">
                    {m.champion_version || '—'} {m.champion_stage && <span className="text-xs text-ink-400">({m.champion_stage})</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-ink-400">{new Date(m.updated_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={STATUS_TONE[m.status] || 'neutral'}>{m.status}</Badge>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-400">
                    No models registered for this capability.
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
