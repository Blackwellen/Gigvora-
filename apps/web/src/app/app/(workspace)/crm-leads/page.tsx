'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Plus, Search, Target, TrendingUp, UserCheck, Users } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { CrmLocalNav } from '@/components/crm/CrmLocalNav';
import { useConvertCrmLead, useCreateCrmLead, useCrmLeads, useDisqualifyCrmLead } from '@/hooks/crm/useCrmLeads';
import type { CrmLead, CrmLeadInput, CrmLeadStatus, CrmLeadsFilter } from '@/hooks/crm/types';
import { getApiErrorMessage } from '@/lib/api';

const PAGE_SIZE = 20;

const selectClass =
  'h-9 rounded-lg border border-ink-200 bg-white px-2.5 text-xs font-semibold text-ink-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200';

const LEAD_STATUS_TONE: Record<CrmLeadStatus, 'brand' | 'neutral' | 'success' | 'warning' | 'danger'> = {
  new: 'brand',
  working: 'brand',
  qualified: 'success',
  nurture: 'neutral',
  converted: 'success',
  disqualified: 'danger',
};

const LEAD_STATUS_OPTIONS: CrmLeadStatus[] = ['new', 'working', 'qualified', 'nurture', 'converted', 'disqualified'];

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

function leadName(l: CrmLead) {
  return l.display_name || `${l.first_name || ''} ${l.last_name || ''}`.trim() || 'Unnamed lead';
}

function ConvertLeadModal({ lead, onClose }: { lead: CrmLead | null; onClose: () => void }) {
  const convertLead = useConvertCrmLead();
  const [createOpportunity, setCreateOpportunity] = useState(false);
  const [opportunityName, setOpportunityName] = useState('');
  const [value, setValue] = useState('');

  const handleClose = () => {
    setCreateOpportunity(false);
    setOpportunityName('');
    setValue('');
    convertLead.reset();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;
    convertLead.mutate(
      {
        id: lead.id,
        createOpportunity,
        opportunityName: createOpportunity ? opportunityName || undefined : undefined,
        value: createOpportunity && value ? Number(value) : undefined,
      },
      { onSuccess: handleClose }
    );
  };

  return (
    <Modal open={Boolean(lead)} onClose={handleClose} className="max-w-md" labelledBy="convert-lead-title">
      <ModalHeader title={`Convert ${lead ? leadName(lead) : ''}`} onClose={handleClose} />
      <form onSubmit={handleSubmit} className="space-y-3 p-5">
        <p className="text-sm text-ink-500 dark:text-ink-400">This creates or matches a contact and account for this lead.</p>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink-700 dark:text-ink-200">
          <input type="checkbox" checked={createOpportunity} onChange={(e) => setCreateOpportunity(e.target.checked)} className="h-4 w-4 rounded border-ink-300" />
          Also create an opportunity
        </label>
        {createOpportunity && (
          <div className="space-y-3 rounded-lg border border-ink-100 p-3 dark:border-ink-800">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-600 dark:text-ink-300">Opportunity name</label>
              <Input value={opportunityName} onChange={(e) => setOpportunityName(e.target.value)} placeholder={lead ? `${leadName(lead)} opportunity` : ''} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-600 dark:text-ink-300">Value</label>
              <Input type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" />
            </div>
          </div>
        )}
        {convertLead.isError && <p className="text-sm text-red-600 dark:text-red-400">{getApiErrorMessage(convertLead.error)}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={convertLead.isPending}>
            Convert lead
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function DisqualifyLeadModal({ lead, onClose }: { lead: CrmLead | null; onClose: () => void }) {
  const disqualifyLead = useDisqualifyCrmLead();
  const [reason, setReason] = useState('');

  const handleClose = () => {
    setReason('');
    disqualifyLead.reset();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;
    disqualifyLead.mutate({ id: lead.id, reason: reason || undefined }, { onSuccess: handleClose });
  };

  return (
    <Modal open={Boolean(lead)} onClose={handleClose} className="max-w-sm" labelledBy="disqualify-lead-title">
      <ModalHeader title={`Disqualify ${lead ? leadName(lead) : ''}`} onClose={handleClose} />
      <form onSubmit={handleSubmit} className="space-y-3 p-5">
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-600 dark:text-ink-300">Reason (optional)</label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Not a fit, no budget" data-autofocus />
        </div>
        {disqualifyLead.isError && <p className="text-sm text-red-600 dark:text-red-400">{getApiErrorMessage(disqualifyLead.error)}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" loading={disqualifyLead.isPending}>
            Disqualify
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function CreateLeadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createLead = useCreateCrmLead();
  const [form, setForm] = useState({ firstName: '', lastName: '', companyName: '', jobTitle: '', email: '', leadSource: '' });

  const handleClose = () => {
    setForm({ firstName: '', lastName: '', companyName: '', jobTitle: '', email: '', leadSource: '' });
    createLead.reset();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: CrmLeadInput = {
      firstName: form.firstName || undefined,
      lastName: form.lastName || undefined,
      companyName: form.companyName || undefined,
      jobTitle: form.jobTitle || undefined,
      email: form.email || undefined,
      leadSource: form.leadSource || undefined,
    };
    createLead.mutate(body, { onSuccess: handleClose });
  };

  return (
    <Modal open={open} onClose={handleClose} className="max-w-lg" labelledBy="create-lead-title">
      <ModalHeader title="Add lead" onClose={handleClose} />
      <form onSubmit={handleSubmit} className="space-y-3 p-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-600 dark:text-ink-300">First name</label>
            <Input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} data-autofocus />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-600 dark:text-ink-300">Last name</label>
            <Input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-600 dark:text-ink-300">Company name</label>
          <Input value={form.companyName} onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-600 dark:text-ink-300">Job title</label>
          <Input value={form.jobTitle} onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-600 dark:text-ink-300">Email</label>
          <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-600 dark:text-ink-300">Lead source</label>
          <Input value={form.leadSource} onChange={(e) => setForm((f) => ({ ...f, leadSource: e.target.value }))} placeholder="e.g. referral, inbound, event" />
        </div>
        {createLead.isError && <p className="text-sm text-red-600 dark:text-red-400">{getApiErrorMessage(createLead.error)}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={createLead.isPending} disabled={!form.firstName && !form.lastName && !form.companyName}>
            Add lead
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function CrmLeadsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [leadStatus, setLeadStatus] = useState<CrmLeadStatus | 'all'>('all');
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [convertLead, setConvertLead] = useState<CrmLead | null>(null);
  const [disqualifyLead, setDisqualifyLead] = useState<CrmLead | null>(null);

  const filter: CrmLeadsFilter = useMemo(
    () => ({
      search: search || undefined,
      leadStatus: leadStatus === 'all' ? undefined : leadStatus,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }),
    [search, leadStatus, page]
  );

  const { data, isLoading, isError, error } = useCrmLeads(filter);
  const leads = data?.data || [];
  const total = data?.meta.total ?? 0;
  const hasNext = (page + 1) * PAGE_SIZE < total;
  const hasFilters = Boolean(search || leadStatus !== 'all');

  const kpis = useMemo(() => {
    const newCount = leads.filter((l) => l.lead_status === 'new').length;
    const qualifiedCount = leads.filter((l) => l.lead_status === 'qualified').length;
    const unassignedCount = leads.filter((l) => !l.owner_user_id).length;
    const scored = leads.filter((l) => l.fit_score != null);
    const avgFit = scored.length ? Math.round(scored.reduce((sum, l) => sum + (l.fit_score || 0), 0) / scored.length) : null;
    return { newCount, qualifiedCount, unassignedCount, avgFit };
  }, [leads]);

  const columns: DataTableColumn<CrmLead>[] = [
    {
      key: 'lead',
      header: 'Lead',
      render: (l) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={leadName(l)} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink-900 dark:text-white">{leadName(l)}</p>
            {l.job_title && <p className="truncate text-xs text-ink-400 dark:text-ink-500">{l.job_title}</p>}
          </div>
        </div>
      ),
    },
    { key: 'account', header: 'Account', render: (l) => <span className="text-ink-600 dark:text-ink-300">{l.company_name || '—'}</span> },
    { key: 'source', header: 'Source', render: (l) => <span className="text-ink-500 dark:text-ink-400">{l.lead_source || '—'}</span> },
    { key: 'status', header: 'Status', render: (l) => <Badge tone={LEAD_STATUS_TONE[l.lead_status]}>{l.lead_status}</Badge> },
    { key: 'fit', header: 'Fit score', render: (l) => <ScoreBadge score={l.fit_score} /> },
    { key: 'intent', header: 'Intent score', render: (l) => <ScoreBadge score={l.intent_score} /> },
    { key: 'owner', header: 'Owner', render: (l) => <span className="text-xs text-ink-500 dark:text-ink-400">{l.owner_user_id ? l.owner_user_id.slice(0, 8) : 'Unassigned'}</span> },
    { key: 'created', header: 'Created', render: (l) => <span className="text-ink-500 dark:text-ink-400">{format(new Date(l.created_at), 'MMM d, yyyy')}</span> },
    {
      key: 'actions',
      header: 'Actions',
      render: (l) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="outline"
            disabled={l.lead_status === 'converted' || l.lead_status === 'disqualified'}
            onClick={() => setConvertLead(l)}
          >
            Convert
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={l.lead_status === 'converted' || l.lead_status === 'disqualified'}
            onClick={() => setDisqualifyLead(l)}
          >
            Disqualify
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
            <Target className="h-5 w-5 text-brand-600" /> Leads
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Work new leads, track fit and intent scores, and convert winners into accounts and opportunities.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Add lead
        </Button>
      </div>

      <CrmLocalNav active="leads" />

      <KpiGrid>
        <KpiCard label="New leads" value={isLoading ? '—' : kpis.newCount} icon={Target} tone="brand" />
        <KpiCard label="Qualified" value={isLoading ? '—' : kpis.qualifiedCount} icon={UserCheck} tone="success" />
        <KpiCard label="Unassigned" value={isLoading ? '—' : kpis.unassignedCount} icon={Users} tone={kpis.unassignedCount > 0 ? 'warning' : 'default'} />
        <KpiCard label="Avg fit score" value={isLoading || kpis.avgFit == null ? '—' : kpis.avgFit} icon={TrendingUp} />
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
              placeholder="Search leads by name or company"
              className="pl-9"
            />
          </div>
          <select
            value={leadStatus}
            onChange={(e) => {
              setLeadStatus(e.target.value as CrmLeadStatus | 'all');
              setPage(0);
            }}
            aria-label="Filter by lead status"
            className={selectClass}
          >
            <option value="all">All statuses</option>
            {LEAD_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {isError && <p className="text-sm text-red-600 dark:text-red-400">{getApiErrorMessage(error)}</p>}

      <DataTable
        columns={columns}
        data={leads}
        rowKey={(l) => l.id}
        isLoading={isLoading}
        onRowClick={(l) => router.push(`/app/crm-lead-detail?id=${l.id}`)}
        emptyTitle={hasFilters ? 'No leads match your filters' : 'No leads yet'}
        emptyDescription={hasFilters ? 'Try a different search or status.' : 'Add your first lead to start working your pipeline.'}
      />

      {!isLoading && !isError && leads.length > 0 && (
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

      <CreateLeadModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <ConvertLeadModal lead={convertLead} onClose={() => setConvertLead(null)} />
      <DisqualifyLeadModal lead={disqualifyLead} onClose={() => setDisqualifyLead(null)} />
    </div>
  );
}
