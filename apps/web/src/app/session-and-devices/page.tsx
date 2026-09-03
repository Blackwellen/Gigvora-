'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, getApiErrorMessage } from '@/lib/api';
import { RiskBadge, StatusChip } from '@/components/security/RiskBadge';
import { useSecurityRealtime } from '@/hooks/useSecurityRealtime';

type Tab = 'sessions' | 'devices' | 'passkeys' | 'history';

type SessionRow = {
  id: string;
  user_email: string;
  first_name: string;
  last_name: string;
  device_name: string | null;
  platform: string | null;
  browser_name: string | null;
  os_name: string | null;
  ip_prefix: string | null;
  last_seen_at: string;
  risk_band: string | null;
  risk_score: string | null;
  trusted: boolean;
  auth_level: string;
  user_agent_summary: string | null;
  created_at: string;
};

export default function SessionAndDevicesPage() {
  const [tab, setTab] = useState<Tab>('sessions');
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [passkeys, setPasskeys] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [health, setHealth] = useState<{ status: string; checks: Record<string, any> } | null>(null);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [selected, setSelected] = useState<SessionRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sessionsRes, devicesRes, passkeysRes, historyRes, healthRes] = await Promise.all([
        api.get('/security/sessions', { params: { search: search || undefined, riskBand: riskFilter || undefined } }),
        api.get('/security/devices'),
        api.get('/auth/passkeys'),
        api.get('/security/login-history'),
        api.get('/security/health'),
      ]);
      setSessions(sessionsRes.data.rows);
      setDevices(devicesRes.data.rows);
      setPasskeys(passkeysRes.data.passkeys);
      setHistory(historyRes.data.rows);
      setHealth(healthRes.data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, riskFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const status = useSecurityRealtime(
    useCallback(
      (event) => {
        if (['session', 'device', 'security_alert'].includes(event.aggregateType)) load();
      },
      [load]
    )
  );

  async function signOutSession(id: string) {
    await api.post(`/security/sessions/${id}/revoke`);
    setSelected(null);
    load();
  }

  async function revokeOtherSessions() {
    await api.post('/security/sessions/revoke-others');
    load();
  }

  async function trustDevice(id: string) {
    await api.post(`/security/devices/${id}/trust`);
    load();
  }

  async function revokeDevice(id: string) {
    await api.post(`/security/devices/${id}/revoke`);
    load();
  }

  const activeCount = sessions.length;
  const trustedCount = devices.filter((d) => d.trusted_at && !d.revoked_at).length;
  const riskyCount = sessions.filter((s) => s.risk_band === 'high' || s.risk_band === 'critical').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-5 lg:px-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-brand-600">03.10 / Session &amp; Devices</p>
            <h1 className="mt-1 text-2xl font-extrabold text-gray-900">Session &amp; Devices</h1>
            <p className="text-gray-500">Monitor active sessions, manage trusted devices, and review sign-ins.</p>
          </div>
          <div className="flex items-center gap-3">
            <ConnectionDot status={status} />
            <button onClick={() => load()} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">↻ Refresh</button>
            <button onClick={revokeOtherSessions} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
              Sign out other sessions
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6 lg:px-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Active Sessions" value={activeCount} tone="brand" />
          <SummaryCard label="Trusted Devices" value={trustedCount} tone="brand" />
          <SummaryCard label="Risky Sessions" value={riskyCount} tone="red" />
          <SummaryCard label="Security Health" value={health?.status === 'good' ? 'Good' : health?.status === 'attention' ? 'Attention' : 'At risk'} tone={health?.status === 'good' ? 'green' : 'amber'} />
        </div>

        <div className="mt-6 flex gap-6 border-b border-gray-200 text-sm font-semibold text-gray-500">
          {(['sessions', 'devices', 'passkeys', 'history'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`border-b-2 px-1 pb-3 capitalize ${tab === t ? 'border-brand-600 text-brand-600' : 'border-transparent hover:text-gray-700'}`}
            >
              {t === 'sessions' ? 'Active Sessions' : t === 'devices' ? 'Trusted Devices' : t === 'passkeys' ? 'Passkeys' : 'Login History'}
            </button>
          ))}
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="rounded-2xl border border-gray-200 bg-white">
            {tab === 'sessions' && (
              <>
                <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-4">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search sessions"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                  <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    <option value="">All risk levels</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                  <span className="ml-auto text-sm text-gray-400">{sessions.length} results</span>
                </div>
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-gray-400">
                    <tr>
                      <th className="px-4 py-3">Device / Browser</th>
                      <th className="px-4 py-3">IP / Region</th>
                      <th className="px-4 py-3">Last Active</th>
                      <th className="px-4 py-3">Risk</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => (
                      <tr key={s.id} className="cursor-pointer border-t border-gray-100 hover:bg-gray-50" onClick={() => setSelected(s)}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{s.device_name || 'Unknown device'}</p>
                          <p className="text-xs text-gray-400">{s.os_name || s.platform} · {s.browser_name}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{s.ip_prefix || '—'}</td>
                        <td className="px-4 py-3 text-gray-500">{new Date(s.last_seen_at).toLocaleString()}</td>
                        <td className="px-4 py-3"><RiskBadge band={s.risk_band} /></td>
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              signOutSession(s.id);
                            }}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                          >
                            Sign out
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!loading && sessions.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No active sessions found.</td></tr>
                    )}
                  </tbody>
                </table>
              </>
            )}

            {tab === 'devices' && (
              <ul className="divide-y divide-gray-100">
                {devices.map((d) => (
                  <li key={d.id} className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium text-gray-900">{d.display_name || 'Unknown device'}</p>
                      <p className="text-xs text-gray-400">{d.os_name} · {d.browser_name} · first seen {new Date(d.first_seen_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {d.trusted_at ? <StatusChip status="active" /> : <StatusChip status="dismissed" />}
                      {d.trusted_at ? (
                        <button onClick={() => revokeDevice(d.id)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">Revoke</button>
                      ) : (
                        <button onClick={() => trustDevice(d.id)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100">Trust device</button>
                      )}
                    </div>
                  </li>
                ))}
                {devices.length === 0 && <li className="p-10 text-center text-gray-400">No devices recorded yet.</li>}
              </ul>
            )}

            {tab === 'passkeys' && (
              <ul className="divide-y divide-gray-100">
                {passkeys.map((p) => (
                  <li key={p.id} className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium text-gray-900">{p.label || 'Passkey'}</p>
                      <p className="text-xs text-gray-400">Created {new Date(p.created_at).toLocaleDateString()}{p.last_used_at ? ` · last used ${new Date(p.last_used_at).toLocaleDateString()}` : ''}</p>
                    </div>
                    <button
                      onClick={async () => {
                        await api.delete(`/auth/passkeys/${p.id}`);
                        load();
                      }}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </li>
                ))}
                {passkeys.length === 0 && (
                  <li className="p-10 text-center text-gray-400">
                    No passkeys yet. <a href="/passkey-setup/new" className="font-semibold text-brand-600 hover:underline">Set one up</a>
                  </li>
                )}
              </ul>
            )}

            {tab === 'history' && (
              <ul className="divide-y divide-gray-100 text-sm">
                {history.map((h) => (
                  <li key={h.id} className="flex items-center justify-between px-4 py-3">
                    <span className="capitalize text-gray-700">{h.outcome.replace('_', ' ')}</span>
                    <span className="text-gray-400">{new Date(h.created_at).toLocaleString()}</span>
                  </li>
                ))}
                {history.length === 0 && <li className="p-10 text-center text-gray-400">No sign-in history yet.</li>}
              </ul>
            )}
          </div>

          <aside className="rounded-2xl border border-gray-200 bg-white p-5">
            {selected ? (
              <div className="space-y-4 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-gray-900">{selected.device_name || 'Session'}</p>
                  <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
                <Detail label="Session ID" value={selected.id} mono />
                <Detail label="OS" value={selected.os_name || '—'} />
                <Detail label="Browser" value={selected.browser_name || '—'} />
                <Detail label="IP" value={selected.ip_prefix || '—'} />
                <Detail label="Auth level" value={selected.auth_level} />
                <Detail label="Risk" value={<RiskBadge band={selected.risk_band} />} />
                <Detail label="Last active" value={new Date(selected.last_seen_at).toLocaleString()} />
                <button onClick={() => signOutSession(selected.id)} className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white">Sign out of session</button>
                <button onClick={() => signOutSession(selected.id)} className="w-full rounded-lg border border-red-200 py-2.5 text-sm font-semibold text-red-600">Revoke access</button>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Select a session to view details.</p>
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

function ConnectionDot({ status }: { status: string }) {
  const color = status === 'connected' ? 'bg-green-500' : status === 'connecting' ? 'bg-amber-400' : 'bg-gray-300';
  const label = status === 'connected' ? 'Live' : status === 'connecting' ? 'Connecting…' : 'Offline';
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
      <span className={`h-2 w-2 rounded-full ${color}`} /> {label}
    </span>
  );
}
