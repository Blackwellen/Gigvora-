'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, getApiErrorMessage } from '@/lib/api';
import { SeverityBadge, StatusChip } from '@/components/security/RiskBadge';
import { useSecurityRealtime } from '@/hooks/useSecurityRealtime';

type AlertRow = {
  id: string;
  title: string;
  alert_type: string;
  severity: string;
  status: string;
  risk_score: string | null;
  user_email: string;
  last_seen_at: string;
  first_seen_at: string;
  metadata: Record<string, any>;
};

type Tab = 'open' | 'resolved' | 'rules' | 'history';

export default function SecurityAlertsPage() {
  const [tab, setTab] = useState<Tab>('open');
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [selected, setSelected] = useState<AlertRow | null>(null);
  const [detail, setDetail] = useState<{ notes: any[]; relatedEvents: any[] } | null>(null);
  const [severityFilter, setSeverityFilter] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const status = tab === 'open' ? 'open' : tab === 'resolved' ? 'resolved' : undefined;
      const { data } = await api.get('/security/alerts', { params: { status, severity: severityFilter || undefined, search: search || undefined } });
      setAlerts(data.rows);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }, [tab, severityFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  useSecurityRealtime(
    useCallback(
      (event) => {
        if (event.aggregateType === 'security_alert') load();
      },
      [load]
    )
  );

  async function openDetail(alert: AlertRow) {
    setSelected(alert);
    const { data } = await api.get(`/security/alerts/${alert.id}`);
    setDetail({ notes: data.notes, relatedEvents: data.relatedEvents });
  }

  async function act(action: string) {
    if (!selected) return;
    await api.post(`/security/alerts/${selected.id}/${action}`);
    setSelected(null);
    load();
  }

  async function addNote() {
    if (!selected || !note.trim()) return;
    await api.post(`/security/alerts/${selected.id}/notes`, { body: note });
    setNote('');
    openDetail(selected);
  }

  const openCount = alerts.filter((a) => a.status === 'open').length;
  const highCount = alerts.filter((a) => a.severity === 'high' || a.severity === 'critical').length;
  const mediumCount = alerts.filter((a) => a.severity === 'medium').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-5 lg:px-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-brand-600">03.11 / Security Alerts</p>
            <h1 className="mt-1 text-2xl font-extrabold text-gray-900">Security Alerts</h1>
            <p className="text-gray-500">Monitor suspicious sign-ins, risk signals, and account security events in real time.</p>
          </div>
          <button onClick={() => load()} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">↻ Refresh</button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6 lg:px-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Open Alerts" value={openCount} tone="red" />
          <SummaryCard label="High Severity" value={highCount} tone="red" />
          <SummaryCard label="Medium Severity" value={mediumCount} tone="amber" />
          <SummaryCard label="Security Health" value="Good" tone="green" />
        </div>

        <div className="mt-6 flex gap-6 border-b border-gray-200 text-sm font-semibold text-gray-500">
          {(['open', 'resolved', 'rules', 'history'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`border-b-2 px-1 pb-3 capitalize ${tab === t ? 'border-brand-600 text-brand-600' : 'border-transparent hover:text-gray-700'}`}
            >
              {t === 'open' ? 'Open Alerts' : t}
            </button>
          ))}
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-2xl border border-gray-200 bg-white">
            {(tab === 'open' || tab === 'resolved') && (
              <>
                <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-4">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search alerts"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                  <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    <option value="">All severity</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                  <span className="ml-auto text-sm text-gray-400">{alerts.length} results</span>
                </div>
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-gray-400">
                    <tr>
                      <th className="px-4 py-3">Alert</th>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Triggered</th>
                      <th className="px-4 py-3">Severity</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((a) => (
                      <tr key={a.id} className="cursor-pointer border-t border-gray-100 hover:bg-gray-50" onClick={() => openDetail(a)}>
                        <td className="px-4 py-3 font-medium text-gray-900">{a.title}</td>
                        <td className="px-4 py-3 text-gray-500">{a.user_email}</td>
                        <td className="px-4 py-3 text-gray-500">{new Date(a.last_seen_at).toLocaleString()}</td>
                        <td className="px-4 py-3"><SeverityBadge severity={a.severity} /></td>
                        <td className="px-4 py-3"><StatusChip status={a.status} /></td>
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetail(a);
                            }}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                          >
                            Investigate
                          </button>
                        </td>
                      </tr>
                    ))}
                    {alerts.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No {tab} alerts.</td></tr>
                    )}
                  </tbody>
                </table>
              </>
            )}
            {tab === 'rules' && (
              <div className="p-6 text-sm text-gray-500">
                Alert rules are configured server-side in the deterministic policy engine and risk models. Rule tuning UI is planned for a future release.
              </div>
            )}
            {tab === 'history' && (
              <div className="p-6 text-sm text-gray-500">All resolved and dismissed alerts appear in the Resolved tab with full audit history.</div>
            )}
          </div>

          <aside className="rounded-2xl border border-gray-200 bg-white p-5">
            {selected ? (
              <div className="space-y-4 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-gray-900">{selected.title}</p>
                  <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
                <div className="flex items-center gap-2"><SeverityBadge severity={selected.severity} /><StatusChip status={selected.status} /></div>
                <Detail label="User" value={selected.user_email} />
                <Detail label="Triggered" value={new Date(selected.last_seen_at).toLocaleString()} />
                <Detail label="Alert ID" value={selected.id} mono />
                <Detail label="Risk score" value={selected.risk_score ? `${Math.round(Number(selected.risk_score))} / 100` : '—'} />

                <div className="space-y-2 pt-2">
                  <button onClick={() => act('resolve')} className="w-full rounded-lg bg-brand-600 py-2 text-sm font-semibold text-white">✓ Mark resolved</button>
                  <button onClick={() => act('actions/force-sign-out')} className="w-full rounded-lg border border-gray-300 py-2 text-sm font-semibold text-gray-700">Force sign-out</button>
                  <button onClick={() => act('actions/require-password-reset')} className="w-full rounded-lg border border-gray-300 py-2 text-sm font-semibold text-gray-700">Require password reset</button>
                  <button onClick={() => act('escalate')} className="w-full rounded-lg border border-gray-300 py-2 text-sm font-semibold text-gray-700">Escalate to analyst</button>
                </div>

                {detail && (
                  <div className="border-t border-gray-100 pt-3">
                    <p className="font-semibold text-gray-800">Notes</p>
                    <ul className="mt-2 space-y-2 text-xs text-gray-500">
                      {detail.notes.map((n) => (
                        <li key={n.id} className="rounded-lg bg-gray-50 p-2">{n.body}</li>
                      ))}
                      {detail.notes.length === 0 && <li className="text-gray-400">No notes yet.</li>}
                    </ul>
                    <div className="mt-2 flex gap-2">
                      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…" className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-xs" />
                      <button onClick={addNote} className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white">Add</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Select an alert to view details.</p>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string | number; tone: 'brand' | 'red' | 'green' | 'amber' }) {
  const colors = { brand: 'text-brand-600', red: 'text-red-600', green: 'text-green-600', amber: 'text-amber-600' }[tone];
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`mt-2 text-3xl font-extrabold ${colors}`}>{value}</p>
    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium text-gray-900 ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  );
}
