'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Building2, Plus, Search, Sparkles, TrendingUp, Users } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { CrmLocalNav } from '@/components/crm/CrmLocalNav';
import { useCreateCrmAccount, useCrmAccounts } from '@/hooks/crm/useCrmAccounts';
import type { CrmAccount, CrmAccountInput, CrmAccountTier, CrmAccountsFilter } from '@/hooks/crm/types';
import { getApiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';

const PAGE_SIZE = 20;

const selectClass =
  'h-9 rounded-lg border border-ink-200 bg-white px-2.5 text-xs font-semibold text-ink-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200';

const TIER_TONE: Record<CrmAccountTier, 'brand' | 'neutral' | 'success' | 'warning' | 'danger'> = {
  strategic: 'brand',
  key: 'success',
  standard: 'neutral',
  prospect: 'warning',
};

const TIER_OPTIONS: CrmAccountTier[] = ['strategic', 'key', 'standard', 'prospect'];

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

function formatMoney(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}

function AccountLogo({ account }: { account: CrmAccount }) {
  if (account.logo_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={account.logo_url} alt={account.name} className="h-8 w-8 shrink-0 rounded-lg object-cover ring-1 ring-black/5" />;
  }
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-sm font-bold text-brand-700 ring-1 ring-black/5 dark:bg-brand-500/15 dark:text-brand-400">
      {account.name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

function CreateAccountModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createAccount = useCreateCrmAccount();
  const [form, setForm] = useState({ name: '', domain: '', industry: '', accountTier: 'prospect' as CrmAccountTier, website: '' });

  const handleClose = () => {
    setForm({ name: '', domain: '', industry: '', accountTier: 'prospect', website: '' });
    createAccount.reset();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: CrmAccountInput = {
      name: form.name,
      domain: form.domain || undefined,
      industry: form.industry || undefined,
      accountTier: form.accountTier,
      website: form.website || undefined,
    };
    createAccount.mutate(body, { onSuccess: handleClose });
  };

  return (
    <Modal open={open} onClose={handleClose} className="max-w-lg" labelledBy="create-account-title">
      <ModalHeader title="Add account" onClose={handleClose} />
      <form onSubmit={handleSubmit} className="space-y-3 p-5">
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-600 dark:text-ink-300">Account name</label>
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required data-autofocus />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-600 dark:text-ink-300">Domain</label>
          <Input value={form.domain} onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))} placeholder="example.com" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-600 dark:text-ink-300">Industry</label>
          <Input value={form.industry} onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-600 dark:text-ink-300">Account tier</label>
          <select value={form.accountTier} onChange={(e) => setForm((f) => ({ ...f, accountTier: e.target.value as CrmAccountTier }))} className={cn(selectClass, 'w-full')}>
            {TIER_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-600 dark:text-ink-300">Website</label>
          <Input value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} placeholder="https://example.com" />
        </div>
        {createAccount.isError && <p className="text-sm text-red-600 dark:text-red-400">{getApiErrorMessage(createAccount.error)}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={createAccount.isPending} disabled={!form.name}>
            Add account
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function CrmAccountsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('');
  const [accountTier, setAccountTier] = useState<CrmAccountTier | 'all'>('all');
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);

  const filter: CrmAccountsFilter = useMemo(
    () => ({
      search: search || undefined,
      industry: industry || undefined,
      accountTier: accountTier === 'all' ? undefined : accountTier,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }),
    [search, industry, accountTier, page]
  );

  const { data, isLoading, isError, error } = useCrmAccounts(filter);
  const accounts = data?.data || [];
  const total = data?.meta.total ?? 0;
  const hasNext = (page + 1) * PAGE_SIZE < total;
  const hasFilters = Boolean(search || industry || accountTier !== 'all');

  const kpis = useMemo(() => {
    const activeCount = accounts.filter((a) => a.lifecycle_stage === 'active').length;
    const openPipeline = accounts.reduce((sum, a) => sum + (a.open_pipeline_value || 0), 0);
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const newThisMonth = accounts.filter((a) => new Date(a.created_at).getTime() >= thirtyDaysAgo).length;
    return { activeCount, openPipeline, newThisMonth };
  }, [accounts]);

  const columns: DataTableColumn<CrmAccount>[] = [
    {
      key: 'account',
      header: 'Account',
      render: (a) => (
        <div className="flex items-center gap-2.5">
          <AccountLogo account={a} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink-900 dark:text-white">{a.name}</p>
            {a.domain && <p className="truncate text-xs text-ink-400 dark:text-ink-500">{a.domain}</p>}
          </div>
        </div>
      ),
    },
    { key: 'industry', header: 'Industry', render: (a) => <span className="text-ink-600 dark:text-ink-300">{a.industry || '—'}</span> },
    { key: 'tier', header: 'Tier', render: (a) => <Badge tone={TIER_TONE[a.account_tier]}>{a.account_tier}</Badge> },
    { key: 'health', header: 'Health', render: (a) => <ScoreBadge score={a.relationship_health_score} /> },
    { key: 'open_pipeline', header: 'Open pipeline', render: (a) => <span className="font-semibold text-ink-900 dark:text-white">{formatMoney(a.open_pipeline_value, a.currency)}</span> },
    { key: 'owner', header: 'Owner', render: (a) => <span className="text-xs text-ink-500 dark:text-ink-400">{a.owner_user_id ? a.owner_user_id.slice(0, 8) : 'Unassigned'}</span> },
    {
      key: 'last_activity',
      header: 'Last activity',
      render: (a) => <span className="text-ink-500 dark:text-ink-400">{a.last_interaction_at ? format(new Date(a.last_interaction_at), 'MMM d, yyyy') : '—'}</span>,
    },
    { key: 'enrichment', header: 'Enrichment', render: (a) => <Badge tone="neutral">{a.enrichment_status.replace(/_/g, ' ')}</Badge> },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
            <Building2 className="h-5 w-5 text-brand-600" /> Accounts
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Companies you sell to and grow, with relationship health and open pipeline at a glance.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Add account
        </Button>
      </div>

      <CrmLocalNav active="accounts" />

      <KpiGrid>
        <KpiCard label="Total accounts" value={isLoading ? '—' : total} icon={Building2} tone="brand" />
        <KpiCard label="Active accounts" value={isLoading ? '—' : kpis.activeCount} icon={Sparkles} tone="success" />
        <KpiCard label="Open pipeline" value={isLoading ? '—' : formatMoney(kpis.openPipeline)} icon={TrendingUp} />
        <KpiCard label="New this month" value={isLoading ? '—' : kpis.newThisMonth} icon={Users} />
      </KpiGrid>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Search accounts by name or domain"
              className="pl-9"
            />
          </div>
          <Input
            value={industry}
            onChange={(e) => {
              setIndustry(e.target.value);
              setPage(0);
            }}
            placeholder="Filter by industry"
            className="w-[180px]"
          />
          <select
            value={accountTier}
            onChange={(e) => {
              setAccountTier(e.target.value as CrmAccountTier | 'all');
              setPage(0);
            }}
            aria-label="Filter by account tier"
            className={selectClass}
          >
            <option value="all">All tiers</option>
            {TIER_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {isError && <p className="text-sm text-red-600 dark:text-red-400">{getApiErrorMessage(error)}</p>}

      <DataTable
        columns={columns}
        data={accounts}
        rowKey={(a) => a.id}
        isLoading={isLoading}
        onRowClick={(a) => router.push(`/app/crm-account-detail?id=${a.id}`)}
        emptyTitle={hasFilters ? 'No accounts match your filters' : 'No accounts yet'}
        emptyDescription={hasFilters ? 'Try a different search, industry, or tier.' : 'Add your first account to start tracking relationships.'}
      />

      {!isLoading && !isError && accounts.length > 0 && (
        <div className="flex items-center justify-between pt-1">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            Previous
          </Button>
          <span className="text-xs text-ink-400 dark:text-ink-500">
            Page {page + 1} of {Math.max(1, Math.ceil(total / PAGE_SIZE))}
          </span>
          <Button variant="outline" size="sm" disabled={!hasNext} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}

      <CreateAccountModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
