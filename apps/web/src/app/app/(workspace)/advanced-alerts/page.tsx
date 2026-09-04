'use client';

import { useState } from 'react';
import { AlertTriangle, Bell, Check, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { RecruiterSeatGate } from '@/components/recruiter/RecruiterSeatGate';
import { ProUpgradeBanner } from '@/components/recruiter-pro/ProUpgradeBanner';
import { useRecruiterSeat } from '@/hooks/recruiter/useRecruiterSeat';
import { useAdvancedAlerts, useMarkAlertRead, useResolveAlert } from '@/hooks/recruiter-pro/useAdvancedAlerts';
import type { SeverityLevel } from '@/hooks/recruiter-pro/types';
import { getApiErrorMessage } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

const SEVERITY_TONE: Record<SeverityLevel, 'brand' | 'warning' | 'danger'> = {
  info: 'brand',
  warning: 'warning',
  critical: 'danger',
};

const SOURCE_LABEL: Record<string, string> = {
  pipeline_stalled: 'Pipeline stalled',
  candidate_reply: 'Candidate replied',
  sequence_completed: 'Sequence completed',
  campaign_underperforming: 'Campaign underperforming',
  sla_breach: 'SLA breach',
  new_high_match: 'New high match',
  ats_sync_failed: 'ATS sync failed',
};

function AdvancedAlertsInner() {
  const { data: seat } = useRecruiterSeat();
  const isPro = seat?.tier === 'pro';
  const [severity, setSeverity] = useState<SeverityLevel | 'all'>('all');
  const [readState, setReadState] = useState<'all' | 'unread' | 'read'>('unread');
  const { data, isLoading, isError, error } = useAdvancedAlerts({ severity, readState });
  const markRead = useMarkAlertRead();
  const resolve = useResolveAlert();

  return (
    <div className="mx-auto max-w-[1000px] space-y-5 px-4 py-5 lg:px-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
          <Bell className="h-5 w-5 text-purple-600" /> Advanced Alerts
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Real-time signals on pipeline health, outreach performance and ATS syncs.</p>
      </div>

      {!isPro && <ProUpgradeBanner feature="Advanced Alerts" />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={readState}
          onChange={(key) => setReadState(key as 'all' | 'unread' | 'read')}
          tabs={[
            { key: 'unread', label: 'Unread' },
            { key: 'read', label: 'Read' },
            { key: 'all', label: 'All' },
          ]}
        />
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value as SeverityLevel | 'all')}
          className="h-9 rounded-control border border-ink-200 bg-white px-3 text-xs font-semibold text-ink-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
        >
          <option value="all">All severities</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {isError && (
        <Card className="py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load alerts</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      )}

      {data && !isLoading && !isError && (
        <div className="space-y-2">
          {data.length === 0 && (
            <Card className="py-16 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
              <p className="mt-3 text-sm font-semibold text-ink-700 dark:text-ink-200">All caught up</p>
              <p className="mt-1 text-sm text-ink-400 dark:text-ink-500">No alerts match this filter right now.</p>
            </Card>
          )}
          {data.map((alert) => (
            <Card key={alert.id} className={`p-4 ${!alert.is_read ? 'border-l-4 border-l-brand-500' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-300">
                    {alert.severity === 'critical' ? <ShieldAlert className="h-4 w-4 text-red-500" /> : <AlertTriangle className="h-4 w-4" />}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-ink-900 dark:text-white">{alert.title}</p>
                      <Badge tone={SEVERITY_TONE[alert.severity]} className="capitalize">{alert.severity}</Badge>
                      <Badge tone="neutral">{SOURCE_LABEL[alert.source] || alert.source}</Badge>
                      {alert.is_resolved && <Badge tone="success">Resolved</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">{alert.description}</p>
                    <p className="mt-1 text-xs text-ink-400 dark:text-ink-500">{formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  {!alert.is_read && (
                    <Button size="sm" variant="outline" onClick={() => markRead.mutate(alert.id)} loading={markRead.isPending}>
                      <Check className="h-3.5 w-3.5" /> Mark read
                    </Button>
                  )}
                  {!alert.is_resolved && (
                    <Button size="sm" onClick={() => resolve.mutate(alert.id)} loading={resolve.isPending}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdvancedAlertsPage() {
  return (
    <RecruiterSeatGate>
      <AdvancedAlertsInner />
    </RecruiterSeatGate>
  );
}
