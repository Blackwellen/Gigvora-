'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Building2, Check, Contact, Handshake, Loader2, Target, Trophy } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { CrmLocalNav } from '@/components/crm/CrmLocalNav';
import { useCrmAnalyticsOverview } from '@/hooks/crm/useCrmAnalytics';
import { useCrmLeads } from '@/hooks/crm/useCrmLeads';
import { useCrmFollowups, useCompleteCrmFollowup } from '@/hooks/crm/useCrmFollowups';
import { useCrmAccounts } from '@/hooks/crm/useCrmAccounts';
import type { CrmAccount, CrmFollowup, CrmLead, CrmLeadStatus } from '@/hooks/crm/types';
import { getApiErrorMessage } from '@/lib/api';

const LEAD_STATUS_TONE: Record<CrmLeadStatus, 'brand' | 'neutral' | 'success' | 'warning' | 'danger'> = {
  new: 'brand',
  working: 'brand',
  qualified: 'success',
  nurture: 'neutral',
  converted: 'success',
  disqualified: 'danger',
};

const PRIORITY_TONE: Record<CrmFollowup['priority'], 'brand' | 'neutral' | 'success' | 'warning' | 'danger'> = {
  low: 'neutral',
  medium: 'brand',
  high: 'warning',
};

const TIER_TONE: Record<CrmAccount['account_tier'], 'brand' | 'neutral' | 'success' | 'warning' | 'danger'> = {
  strategic: 'brand',
  key: 'success',
  standard: 'neutral',
  prospect: 'warning',
};

function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="text-ink-300">—</span>;
  const tone = score >= 70 ? 'success' : score >= 40 ? 'warning' : 'danger';
  const label = score >= 70 ? 'Strong' : score >= 40 ? 'Moderate' : 'Weak';
  return (
    <Badge tone={tone}>
      {score} {label}
    </Badge>
  );
}

function formatMoney(n: number, currency = 'USD', compact = false) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
    notation: compact ? 'compact' : 'standard',
  }).format(n);
}

const QUICK_ACTIONS = [
  { href: '/app/crm-contacts', label: '+ Contact' },
  { href: '/app/crm-leads', label: '+ Lead' },
  { href: '/app/crm-accounts', label: '+ Account' },
  { href: '/app/crm-opportunities', label: '+ Opportunity' },
];

export default function CrmHomePage() {
  const router = useRouter();
  const overview = useCrmAnalyticsOverview();

  const leadsQuery = useCrmLeads({ limit: 50 });
  const attentionLeads = useMemo(() => {
    const leads = leadsQuery.data?.data || [];
    return leads
      .filter((l) => l.lead_status === 'new' || l.lead_status === 'working')
      .sort((a, b) => (b.intent_score ?? -1) - (a.intent_score ?? -1))
      .slice(0, 6);
  }, [leadsQuery.data]);

  const followupsQuery = useCrmFollowups({ status: 'open', limit: 8 });
  const followups = useMemo(() => {
    return [...(followupsQuery.data?.data || [])].sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime());
  }, [followupsQuery.data]);
  const completeFollowup = useCompleteCrmFollowup();

  const accountsQuery = useCrmAccounts({ limit: 20 });
  const priorityAccounts = useMemo(() => {
    return [...(accountsQuery.data?.data || [])]
      .sort((a, b) => (b.relationship_health_score ?? -1) - (a.relationship_health_score ?? -1))
      .slice(0, 5);
  }, [accountsQuery.data]);

  const leadColumns: DataTableColumn<CrmLead>[] = [
    {
      key: 'lead',
      header: 'Lead',
      render: (l) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={l.display_name || `${l.first_name || ''} ${l.last_name || ''}`.trim() || 'Lead'} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink-900 dark:text-white">{l.display_name || `${l.first_name || ''} ${l.last_name || ''}`.trim() || 'Unnamed lead'}</p>
            {l.company_name && <p className="truncate text-xs text-ink-400 dark:text-ink-500">{l.company_name}</p>}
          </div>
        </div>
      ),
    },
    { key: 'fit', header: 'Fit', render: (l) => <ScoreBadge score={l.fit_score} /> },
    { key: 'status', header: 'Status', render: (l) => <Badge tone={LEAD_STATUS_TONE[l.lead_status]}>{l.lead_status}</Badge> },
    { key: 'owner', header: 'Owner', render: (l) => <span className="text-xs text-ink-500 dark:text-ink-400">{l.owner_user_id ? l.owner_user_id.slice(0, 8) : 'Unassigned'}</span> },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
            <Handshake className="h-5 w-5 text-brand-600" /> CRM
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Manage relationships, leads, accounts, opportunities and follow-ups from one shared workspace.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {QUICK_ACTIONS.map((a) => (
            <Link key={a.href} href={a.href}>
              <Button variant="outline" size="sm">
                {a.label}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      <CrmLocalNav active="home" />

      {overview.isLoading && (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {overview.isError && (
        <Card className="py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&apos;t load CRM overview</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(overview.error)}</p>
        </Card>
      )}

      {overview.data && (
        <KpiGrid>
          <KpiCard label="Total contacts" value={overview.data.contactCount} icon={Contact} tone="brand" />
          <KpiCard label="Active leads" value={overview.data.leadCount} icon={Target} />
          <KpiCard label="Open pipeline" value={formatMoney(overview.data.openPipelineValue, 'USD', true)} icon={Handshake} />
          <KpiCard
            label="Follow-ups due"
            value={overview.data.overdueFollowups}
            icon={Check}
            tone={overview.data.overdueFollowups > 0 ? 'warning' : 'default'}
          />
          <KpiCard
            label="Won this month"
            value={overview.data.wonThisMonth}
            icon={Trophy}
            tone="success"
            hint={formatMoney(overview.data.wonValueThisMonth, 'USD', true)}
          />
        </KpiGrid>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 font-display text-sm font-bold tracking-[-0.01em] text-ink-900 dark:text-white">
              <Target className="h-4 w-4 text-brand-600" /> Leads needing attention
            </h2>
            <Link href="/app/crm-leads" className="text-xs font-semibold text-brand-700 hover:underline dark:text-brand-400">
              View all
            </Link>
          </div>

          {leadsQuery.isError ? (
            <Card className="py-16 text-center">
              <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&apos;t load leads</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(leadsQuery.error)}</p>
            </Card>
          ) : (
            <DataTable
              columns={leadColumns}
              data={attentionLeads}
              rowKey={(l) => l.id}
              isLoading={leadsQuery.isLoading}
              onRowClick={(l) => router.push(`/app/crm-lead-detail?id=${l.id}`)}
              emptyTitle="No leads need attention"
              emptyDescription="New and working leads will show up here as they come in."
            />
          )}
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 font-display text-sm font-bold tracking-[-0.01em] text-ink-900 dark:text-white">
              <Check className="h-4 w-4 text-brand-600" /> Upcoming follow-ups
            </h2>
            <Link href="/app/crm-followups" className="text-xs font-semibold text-brand-700 hover:underline dark:text-brand-400">
              View all
            </Link>
          </div>

          {followupsQuery.isLoading && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
            </div>
          )}

          {followupsQuery.isError && (
            <Card className="py-10 text-center">
              <p className="text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(followupsQuery.error)}</p>
            </Card>
          )}

          {!followupsQuery.isLoading && !followupsQuery.isError && followups.length === 0 && (
            <Card className="border-dashed py-10 text-center">
              <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No open follow-ups</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">You&apos;re all caught up.</p>
            </Card>
          )}

          {!followupsQuery.isLoading && followups.length > 0 && (
            <Card className="divide-y divide-ink-50 dark:divide-ink-800/60">
              {followups.map((f) => {
                const isOverdue = new Date(f.due_at).getTime() < Date.now();
                return (
                  <div key={f.id} className="flex items-center justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold capitalize text-ink-900 dark:text-white">{f.type.replace(/_/g, ' ')}</p>
                      <p className={isOverdue ? 'text-xs font-semibold text-red-600 dark:text-red-400' : 'text-xs text-ink-400 dark:text-ink-500'}>
                        {format(new Date(f.due_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge tone={PRIORITY_TONE[f.priority]}>{f.priority}</Badge>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="Complete follow-up"
                        loading={completeFollowup.isPending && completeFollowup.variables === f.id}
                        onClick={() => completeFollowup.mutate(f.id)}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </Card>
          )}
        </section>
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 font-display text-sm font-bold tracking-[-0.01em] text-ink-900 dark:text-white">
            <Building2 className="h-4 w-4 text-brand-600" /> Priority accounts
          </h2>
          <Link href="/app/crm-accounts" className="text-xs font-semibold text-brand-700 hover:underline dark:text-brand-400">
            View all
          </Link>
        </div>

        {accountsQuery.isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
          </div>
        )}

        {accountsQuery.isError && (
          <Card className="py-10 text-center">
            <p className="text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(accountsQuery.error)}</p>
          </Card>
        )}

        {!accountsQuery.isLoading && !accountsQuery.isError && priorityAccounts.length === 0 && (
          <Card className="border-dashed py-10 text-center">
            <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No accounts yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">Accounts will appear here once created or converted from leads.</p>
          </Card>
        )}

        {!accountsQuery.isLoading && priorityAccounts.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {priorityAccounts.map((a) => (
              <Link key={a.id} href={`/app/crm-account-detail?id=${a.id}`}>
                <Card className="h-full p-3 transition-colors hover:border-ink-300 dark:hover:border-ink-600">
                  <div className="flex items-center gap-2">
                    <Avatar name={a.name} src={a.logo_url} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{a.name}</p>
                      <Badge tone={TIER_TONE[a.account_tier]}>{a.account_tier}</Badge>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <ScoreBadge score={a.relationship_health_score} />
                    <span className="text-xs font-semibold text-ink-600 dark:text-ink-300">{formatMoney(a.open_pipeline_value, a.currency, true)}</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
