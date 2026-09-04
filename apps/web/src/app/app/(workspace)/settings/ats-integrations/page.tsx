'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Link2, Loader2, Plug, RefreshCw, Settings2, XCircle } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { RecruiterSeatGate } from '@/components/recruiter/RecruiterSeatGate';
import { ProUpgradeBanner } from '@/components/recruiter-pro/ProUpgradeBanner';
import { useRecruiterSeat } from '@/hooks/recruiter/useRecruiterSeat';
import {
  useAtsConnections,
  useCreateAtsConnection,
  useDisconnectAtsConnection,
  useAtsFieldMappings,
  useUpdateAtsFieldMapping,
  useAtsSyncRuns,
  useTriggerAtsSync,
} from '@/hooks/recruiter-pro/useAtsIntegrations';
import type { AtsConnection, AtsProvider } from '@/hooks/recruiter-pro/types';
import { getApiErrorMessage } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

const PROVIDER_LABEL: Record<AtsProvider, string> = {
  greenhouse: 'Greenhouse',
  lever: 'Lever',
  workday: 'Workday',
  bamboohr: 'BambooHR',
  icims: 'iCIMS',
};

const ALL_PROVIDERS: AtsProvider[] = ['greenhouse', 'lever', 'workday', 'bamboohr', 'icims'];

const STATUS_META: Record<AtsConnection['status'], { tone: 'success' | 'warning' | 'neutral' | 'danger'; label: string }> = {
  connected: { tone: 'success', label: 'Connected' },
  pending: { tone: 'warning', label: 'Pending' },
  error: { tone: 'danger', label: 'Error' },
  not_connected: { tone: 'neutral', label: 'Not connected' },
};

function ConnectModal({ open, onClose, existingProviders }: { open: boolean; onClose: () => void; existingProviders: AtsProvider[] }) {
  const create = useCreateAtsConnection();
  const [provider, setProvider] = useState<AtsProvider>('greenhouse');
  const [accountName, setAccountName] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate({ provider, external_account_name: accountName || undefined }, { onSuccess: () => { onClose(); setAccountName(''); } });
  }

  const available = ALL_PROVIDERS.filter((p) => !existingProviders.includes(p));

  return (
    <Modal open={open} onClose={onClose} className="max-w-md" labelledBy="connect-ats-title">
      <ModalHeader title="Connect an ATS" onClose={onClose} />
      <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-ink-500 dark:text-ink-400">Provider</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as AtsProvider)}
            className="h-10 w-full rounded-control border border-ink-200 bg-white px-3 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
          >
            {available.length === 0 && <option>All providers connected</option>}
            {available.map((p) => (
              <option key={p} value={p}>{PROVIDER_LABEL[p]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-ink-500 dark:text-ink-400">Account label (optional)</label>
          <input
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="e.g. Acme Corp production"
            className="h-10 w-full rounded-control border border-ink-200 bg-white px-3 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
          />
        </div>
        {create.isError && <p className="text-xs font-semibold text-red-600">{getApiErrorMessage(create.error)}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={create.isPending} disabled={available.length === 0}>Connect</Button>
        </div>
      </form>
    </Modal>
  );
}

function ConnectionDetail({ connection, onClose }: { connection: AtsConnection; onClose: () => void }) {
  const { data: mappings, isLoading: mappingsLoading } = useAtsFieldMappings(connection.id);
  const updateMapping = useUpdateAtsFieldMapping();
  const { data: runs, isLoading: runsLoading } = useAtsSyncRuns(connection.id);
  const triggerSync = useTriggerAtsSync();

  return (
    <Modal open onClose={onClose} className="max-w-2xl" labelledBy="ats-detail-title">
      <ModalHeader title={`${PROVIDER_LABEL[connection.provider]} integration`} onClose={onClose} />
      <div className="max-h-[70vh] space-y-5 overflow-y-auto px-5 py-4">
        <div className="flex items-center justify-between rounded-xl border border-ink-100 p-3 dark:border-ink-800">
          <div>
            <Badge tone={STATUS_META[connection.status].tone}>{STATUS_META[connection.status].label}</Badge>
            <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
              {connection.last_sync_at ? `Last synced ${formatDistanceToNow(new Date(connection.last_sync_at), { addSuffix: true })}` : 'Never synced'}
            </p>
          </div>
          <Button size="sm" onClick={() => triggerSync.mutate(connection.id)} loading={triggerSync.isPending}>
            <RefreshCw className="h-3.5 w-3.5" /> Sync now
          </Button>
        </div>

        <div>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500 dark:text-ink-400">Field mapping</h4>
          {mappingsLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-brand-500" /></div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-ink-100 dark:border-ink-800">
              <table className="w-full text-sm">
                <thead className="bg-ink-50 text-xs text-ink-500 dark:bg-ink-800/60 dark:text-ink-400">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Local field</th>
                    <th className="px-3 py-2 text-left font-semibold">Remote field</th>
                    <th className="px-3 py-2 text-left font-semibold">Entity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-50 dark:divide-ink-800/60">
                  {(!mappings || mappings.length === 0) && (
                    <tr><td colSpan={3} className="px-3 py-6 text-center text-xs text-ink-400 dark:text-ink-500">No field mappings configured.</td></tr>
                  )}
                  {mappings?.map((m) => (
                    <tr key={m.id}>
                      <td className="px-3 py-2 font-medium text-ink-800 dark:text-ink-100">{m.source_field}</td>
                      <td className="px-3 py-2">
                        <input
                          defaultValue={m.target_field}
                          onBlur={(e) => {
                            if (e.target.value !== m.target_field) {
                              updateMapping.mutate({ connectionId: connection.id, id: m.id, target_field: e.target.value });
                            }
                          }}
                          className="h-8 w-full rounded-lg border border-ink-200 bg-white px-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
                        />
                      </td>
                      <td className="px-3 py-2 text-xs capitalize text-ink-500 dark:text-ink-400">{m.entity_type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500 dark:text-ink-400">Sync history</h4>
          {runsLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-brand-500" /></div>
          ) : (
            <div className="space-y-2">
              {(!runs || runs.length === 0) && <p className="py-6 text-center text-xs text-ink-400 dark:text-ink-500">No sync runs yet.</p>}
              {runs?.map((run) => (
                <div key={run.id} className="flex items-center justify-between rounded-xl border border-ink-100 px-3 py-2 dark:border-ink-800">
                  <div className="flex items-center gap-2">
                    {run.status === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : run.status === 'failed' ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin text-ink-400" />
                    )}
                    <span className="text-xs font-semibold capitalize text-ink-800 dark:text-ink-100">{run.status}</span>
                    <span className="text-xs text-ink-400 dark:text-ink-500">{formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}</span>
                  </div>
                  <span className="text-xs text-ink-500 dark:text-ink-400">{run.records_synced} synced</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function AtsIntegrationsInner() {
  const { data: seat } = useRecruiterSeat();
  const isPro = seat?.tier === 'pro';
  const { data: connections, isLoading, isError, error } = useAtsConnections();
  const disconnect = useDisconnectAtsConnection();
  const [connectOpen, setConnectOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const detail = connections?.find((c) => c.id === detailId) || null;

  return (
    <div className="mx-auto px-4 py-5 lg:px-6">
      <Link
        href="/app/recruiter-pro-home"
        className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-brand-600 dark:text-ink-400 dark:hover:text-brand-400"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Recruiter Pro
      </Link>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-[-0.01em] text-ink-900 dark:text-white">
            <Plug className="h-6 w-6 text-purple-600" /> ATS Integrations
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Connect your applicant tracking system to sync candidates, jobs and applications.</p>
        </div>
        <Button onClick={() => setConnectOpen(true)}>
          <Link2 className="h-4 w-4" /> Connect ATS
        </Button>
      </div>

      {!isPro && <ProUpgradeBanner feature="ATS Integrations" />}

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {isError && (
        <Card className="py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load integrations</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      )}

      {connections && !isLoading && !isError && (
        <>
          {connections.length === 0 ? (
            <Card className="py-16 text-center">
              <Plug className="mx-auto h-8 w-8 text-ink-300" />
              <p className="mt-3 text-sm font-semibold text-ink-700 dark:text-ink-200">No ATS connected yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">Connect Greenhouse, Lever, Workday, BambooHR or iCIMS to sync your pipeline automatically.</p>
              <Button className="mt-4" onClick={() => setConnectOpen(true)}><Link2 className="h-4 w-4" /> Connect ATS</Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {connections.map((conn) => {
                const meta = STATUS_META[conn.status];
                return (
                  <Card key={conn.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-display text-sm font-bold text-ink-900 dark:text-white">{PROVIDER_LABEL[conn.provider]}</p>
                        {conn.external_account_name && <p className="text-xs text-ink-500 dark:text-ink-400">{conn.external_account_name}</p>}
                      </div>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </div>
                    <p className="mt-3 text-xs text-ink-500 dark:text-ink-400">
                      {conn.last_sync_at ? `Last synced ${formatDistanceToNow(new Date(conn.last_sync_at), { addSuffix: true })}` : 'Never synced'}
                    </p>
                    <p className="mt-1 text-xs text-ink-400 dark:text-ink-500 capitalize">Health: {conn.health}</p>
                    <div className="mt-4 flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 justify-center" onClick={() => setDetailId(conn.id)}>
                        <Settings2 className="h-3.5 w-3.5" /> Manage
                      </Button>
                      {conn.status !== 'not_connected' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => disconnect.mutate(conn.id)}
                          loading={disconnect.isPending}
                        >
                          Disconnect
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          <Card className="mt-4">
            <CardHeader title="Global sync settings" />
            <div className="space-y-3 px-5 py-4 text-sm text-ink-600 dark:text-ink-300">
              <p>Each connection syncs on its own schedule based on the provider&rsquo;s default interval. Trigger a manual sync any time from a connection&rsquo;s Manage panel.</p>
              <p className="text-xs text-ink-400 dark:text-ink-500">Field mappings control how Gigvora fields map to your ATS&rsquo;s candidate, job, application and interview records.</p>
            </div>
          </Card>
        </>
      )}

      <ConnectModal open={connectOpen} onClose={() => setConnectOpen(false)} existingProviders={connections?.map((c) => c.provider) || []} />
      {detail && <ConnectionDetail connection={detail} onClose={() => setDetailId(null)} />}
    </div>
  );
}

export default function AtsIntegrationsSettingsPage() {
  return (
    <RecruiterSeatGate>
      <AtsIntegrationsInner />
    </RecruiterSeatGate>
  );
}
