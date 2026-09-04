'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Briefcase, Plus, Search } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { CrmLocalNav } from '@/components/crm/CrmLocalNav';
import { useCrmOpportunities, useCreateCrmOpportunity, useMoveCrmOpportunity, useCloseCrmOpportunity } from '@/hooks/crm/useCrmOpportunities';
import { useCrmPipelineStages } from '@/hooks/crm/useCrmPipelineStages';
import { useCrmAccounts } from '@/hooks/crm/useCrmAccounts';
import type { CrmForecastCategory, CrmOpportunity, CrmOpportunitiesFilter } from '@/hooks/crm/types';
import { getApiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';

const PAGE_SIZE = 20;

const selectClass =
  'h-9 rounded-lg border border-ink-200 bg-white px-2.5 text-xs font-semibold text-ink-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200';

const FORECAST_CATEGORIES: Array<{ value: CrmForecastCategory | 'all'; label: string }> = [
  { value: 'all', label: 'All forecast categories' },
  { value: 'pipeline', label: 'Pipeline' },
  { value: 'best_case', label: 'Best case' },
  { value: 'commit', label: 'Commit' },
  { value: 'closed', label: 'Closed' },
];

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0 }).format(value || 0);
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="text-ink-300">—</span>;
  return <Badge tone={score >= 70 ? 'success' : score >= 40 ? 'warning' : 'danger'}>{score} {score >= 70 ? 'Strong' : score >= 40 ? 'Moderate' : 'Weak'}</Badge>;
}

function CreateOpportunityModal({ open, onClose, accounts, stages }: { open: boolean; onClose: () => void; accounts: { id: string; name: string }[]; stages: { id: string; label: string }[] }) {
  const createOpportunity = useCreateCrmOpportunity();
  const [name, setName] = useState('');
  const [accountId, setAccountId] = useState('');
  const [value, setValue] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [stageId, setStageId] = useState('');
  const [expectedCloseDate, setExpectedCloseDate] = useState('');

  function reset() {
    setName('');
    setAccountId('');
    setValue('');
    setCurrency('USD');
    setStageId('');
    setExpectedCloseDate('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !accountId || !stageId) return;
    await createOpportunity.mutateAsync({
      name: name.trim(),
      accountId,
      value: value ? Number(value) : undefined,
      currency,
      stageId,
      expectedCloseDate: expectedCloseDate || undefined,
    });
    reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-lg" labelledBy="create-opportunity-title">
      <ModalHeader title="Create opportunity" onClose={onClose} />
      <form onSubmit={handleSubmit} className="space-y-4 p-5">
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Corp — Enterprise plan" required data-autofocus />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Account</label>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={cn(selectClass, 'w-full')} required>
            <option value="">Select account…</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Value</label>
            <Input type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Currency</label>
            <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Stage</label>
          <select value={stageId} onChange={(e) => setStageId(e.target.value)} className={cn(selectClass, 'w-full')} required>
            <option value="">Select stage…</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Expected close date</label>
          <Input type="date" value={expectedCloseDate} onChange={(e) => setExpectedCloseDate(e.target.value)} />
        </div>
        {createOpportunity.isError && <p className="text-sm text-red-600 dark:text-red-400">{getApiErrorMessage(createOpportunity.error)}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={createOpportunity.isPending}>
            Create opportunity
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function StagePicker({ opportunity, stages, onClose }: { opportunity: CrmOpportunity; stages: { id: string; label: string }[]; onClose: () => void }) {
  const moveOpportunity = useMoveCrmOpportunity();
  return (
    <div
      className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border border-ink-100 bg-white p-1.5 shadow-floating dark:border-ink-800 dark:bg-ink-900"
      onClick={(e) => e.stopPropagation()}
    >
      {stages.map((s) => (
        <button
          key={s.id}
          type="button"
          disabled={moveOpportunity.isPending}
          onClick={() => {
            moveOpportunity.mutate({ id: opportunity.id, stageId: s.id }, { onSuccess: onClose });
          }}
          className={cn(
            'flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold hover:bg-ink-50 dark:hover:bg-ink-800',
            s.id === opportunity.stage_id ? 'text-brand-700 dark:text-brand-400' : 'text-ink-700 dark:text-ink-200'
          )}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

function CloseOpportunityModal({ opportunity, onClose }: { opportunity: CrmOpportunity; onClose: () => void }) {
  const closeOpportunity = useCloseCrmOpportunity();
  const [outcome, setOutcome] = useState<'won' | 'lost'>('won');
  const [reason, setReason] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await closeOpportunity.mutateAsync({ id: opportunity.id, outcome, reason: reason || undefined });
    onClose();
  }

  return (
    <Modal open onClose={onClose} className="max-w-md" labelledBy="close-opportunity-title">
      <ModalHeader title={`Close "${opportunity.name}"`} onClose={onClose} />
      <form onSubmit={handleSubmit} className="space-y-4 p-5">
        <div className="flex gap-3">
          <label className="flex flex-1 items-center gap-2 rounded-xl border border-ink-200 p-3 text-sm font-semibold text-ink-700 has-[:checked]:border-emerald-400 has-[:checked]:bg-emerald-50 dark:border-ink-700 dark:text-ink-200 dark:has-[:checked]:border-emerald-500/50 dark:has-[:checked]:bg-emerald-500/10">
            <input type="radio" name="outcome" value="won" checked={outcome === 'won'} onChange={() => setOutcome('won')} />
            Won
          </label>
          <label className="flex flex-1 items-center gap-2 rounded-xl border border-ink-200 p-3 text-sm font-semibold text-ink-700 has-[:checked]:border-red-400 has-[:checked]:bg-red-50 dark:border-ink-700 dark:text-ink-200 dark:has-[:checked]:border-red-500/50 dark:has-[:checked]:bg-red-500/10">
            <input type="radio" name="outcome" value="lost" checked={outcome === 'lost'} onChange={() => setOutcome('lost')} />
            Lost
          </label>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Reason (optional)</label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why did this close?" />
        </div>
        {closeOpportunity.isError && <p className="text-sm text-red-600 dark:text-red-400">{getApiErrorMessage(closeOpportunity.error)}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant={outcome === 'won' ? 'primary' : 'danger'} loading={closeOpportunity.isPending}>
            Confirm {outcome}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function CrmOpportunitiesPage() {
  const router = useRouter();
  const [stageFilter, setStageFilter] = useState('all');
  const [forecastFilter, setForecastFilter] = useState<CrmForecastCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [stagePickerFor, setStagePickerFor] = useState<string | null>(null);
  const [closeTarget, setCloseTarget] = useState<CrmOpportunity | null>(null);

  const { data: stages } = useCrmPipelineStages();
  const { data: accountsData } = useCrmAccounts({ limit: 200 });
  const { data: allOppsData } = useCrmOpportunities({ limit: 200 });

  const filter: CrmOpportunitiesFilter = useMemo(
    () => ({
      stageId: stageFilter === 'all' ? undefined : stageFilter,
      forecastCategory: forecastFilter === 'all' ? undefined : forecastFilter,
      search: search || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }),
    [stageFilter, forecastFilter, search, page]
  );

  const { data, isLoading, isError, error } = useCrmOpportunities(filter);
  const opportunities = data?.data || [];
  const total = data?.meta.total ?? 0;
  const hasNext = (page + 1) * PAGE_SIZE < total;

  const accountsById = useMemo(() => new Map((accountsData?.data || []).map((a) => [a.id, a.name])), [accountsData]);
  const stagesById = useMemo(() => new Map((stages || []).map((s) => [s.id, s])), [stages]);
  const stageOptions = useMemo(() => (stages || []).slice().sort((a, b) => a.order_index - b.order_index).map((s) => ({ id: s.id, label: s.label })), [stages]);
  const accountOptions = useMemo(() => (accountsData?.data || []).map((a) => ({ id: a.id, name: a.name })), [accountsData]);

  const kpis = useMemo(() => {
    const all = allOppsData?.data || [];
    const wonStageIds = new Set((stages || []).filter((s) => s.is_won).map((s) => s.id));
    const lostStageIds = new Set((stages || []).filter((s) => s.is_lost).map((s) => s.id));
    const open = all.filter((o) => !wonStageIds.has(o.stage_id) && !lostStageIds.has(o.stage_id));
    const closed = all.filter((o) => wonStageIds.has(o.stage_id) || lostStageIds.has(o.stage_id));
    const won = all.filter((o) => wonStageIds.has(o.stage_id));
    const pipelineValue = open.reduce((sum, o) => sum + Number(o.value || 0), 0);
    const weightedValue = open.reduce((sum, o) => sum + Number(o.weighted_value || 0), 0);
    const winRate = closed.length > 0 ? Math.round((won.length / closed.length) * 100) : null;
    return { openCount: open.length, pipelineValue, weightedValue, winRate };
  }, [allOppsData, stages]);

  const columns: DataTableColumn<CrmOpportunity>[] = [
    {
      key: 'name',
      header: 'Opportunity',
      render: (o) => <span className="font-semibold text-brand-700 hover:underline dark:text-brand-400">{o.name}</span>,
    },
    { key: 'account', header: 'Account', render: (o) => <span className="text-ink-600 dark:text-ink-300">{accountsById.get(o.account_id) || '—'}</span> },
    {
      key: 'stage',
      header: 'Stage',
      render: (o) => {
        const stage = stagesById.get(o.stage_id);
        return stage ? (
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
            style={stage.color ? { backgroundColor: `${stage.color}1a`, color: stage.color } : undefined}
          >
            {stage.label}
          </span>
        ) : (
          <Badge tone="neutral">Unknown</Badge>
        );
      },
    },
    { key: 'value', header: 'Value', align: 'right', render: (o) => <span className="font-semibold text-ink-900 dark:text-white">{formatMoney(o.value, o.currency)}</span> },
    { key: 'probability', header: 'Probability', align: 'right', render: (o) => <span className="text-ink-500 dark:text-ink-400">{o.probability}%</span> },
    { key: 'weighted_value', header: 'Weighted value', align: 'right', render: (o) => <span className="text-ink-600 dark:text-ink-300">{formatMoney(o.weighted_value, o.currency)}</span> },
    {
      key: 'expected_close_date',
      header: 'Close date',
      render: (o) => {
        if (!o.expected_close_date) return <span className="text-ink-300">—</span>;
        const stage = stagesById.get(o.stage_id);
        const isClosed = stage?.is_won || stage?.is_lost;
        const isPastDue = !isClosed && new Date(o.expected_close_date) < new Date();
        return <span className={isPastDue ? 'font-semibold text-red-600 dark:text-red-400' : 'text-ink-500 dark:text-ink-400'}>{format(new Date(o.expected_close_date), 'MMM d, yyyy')}</span>;
      },
    },
    { key: 'ai_close_score', header: 'AI close score', render: (o) => <ScoreBadge score={o.ai_close_score} /> },
    { key: 'owner', header: 'Owner', render: (o) => <span className="text-ink-500 dark:text-ink-400">{o.owner_user_id ? 'Assigned' : '—'}</span> },
    {
      key: 'actions',
      header: 'Actions',
      render: (o) => (
        <div className="relative flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button variant="outline" size="sm" onClick={() => setStagePickerFor(stagePickerFor === o.id ? null : o.id)}>
            Advance stage
          </Button>
          {stagePickerFor === o.id && <StagePicker opportunity={o} stages={stageOptions} onClose={() => setStagePickerFor(null)} />}
          <Button variant="ghost" size="sm" onClick={() => setCloseTarget(o)}>
            Close
          </Button>
        </div>
      ),
      align: 'right',
    },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
            <Briefcase className="h-5 w-5 text-brand-600" /> Opportunities
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Every deal in flight, its forecast, and AI-scored likelihood to close.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Create opportunity
        </Button>
      </div>

      <CrmLocalNav active="opportunities" />

      <KpiGrid>
        <KpiCard label="Open opportunities" value={kpis.openCount} icon={Briefcase} tone="brand" />
        <KpiCard label="Pipeline value" value={formatMoney(kpis.pipelineValue, 'USD')} tone="default" />
        <KpiCard label="Weighted pipeline" value={formatMoney(kpis.weightedValue, 'USD')} tone="default" />
        <KpiCard label="Win rate" value={kpis.winRate != null ? `${kpis.winRate}%` : '—'} tone="success" hint="Based on closed opportunities loaded" />
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
              placeholder="Search opportunities"
              className="pl-9"
            />
          </div>
          <select
            value={stageFilter}
            onChange={(e) => {
              setStageFilter(e.target.value);
              setPage(0);
            }}
            aria-label="Filter by stage"
            className={cn(selectClass, 'max-w-[200px]')}
          >
            <option value="all">All stages</option>
            {stageOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            value={forecastFilter}
            onChange={(e) => {
              setForecastFilter(e.target.value as CrmForecastCategory | 'all');
              setPage(0);
            }}
            aria-label="Filter by forecast category"
            className={selectClass}
          >
            {FORECAST_CATEGORIES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {isError && (
        <Card className="py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load opportunities</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      )}

      {!isError && (
        <DataTable
          columns={columns}
          data={opportunities}
          rowKey={(o) => o.id}
          isLoading={isLoading}
          onRowClick={(o) => router.push(`/app/crm-opportunity-detail?id=${o.id}`)}
          emptyTitle={search || stageFilter !== 'all' || forecastFilter !== 'all' ? 'No opportunities match your filters' : 'No opportunities yet'}
          emptyDescription={search || stageFilter !== 'all' || forecastFilter !== 'all' ? 'Try a different search, stage, or forecast category.' : 'Create your first opportunity to start tracking pipeline.'}
        />
      )}

      {!isLoading && !isError && opportunities.length > 0 && (
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

      <CreateOpportunityModal open={createOpen} onClose={() => setCreateOpen(false)} accounts={accountOptions} stages={stageOptions} />
      {closeTarget && <CloseOpportunityModal opportunity={closeTarget} onClose={() => setCloseTarget(null)} />}
    </div>
  );
}
