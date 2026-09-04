'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format, isPast, isToday } from 'date-fns';
import { CalendarClock, Check, Clock, Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Tabs } from '@/components/ui/Tabs';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { CrmLocalNav } from '@/components/crm/CrmLocalNav';
import {
  useCrmFollowups,
  useCreateCrmFollowup,
  useCompleteCrmFollowup,
  useSnoozeCrmFollowup,
} from '@/hooks/crm/useCrmFollowups';
import type { CrmFollowup, CrmFollowupPriority, CrmFollowupType, CrmObjectType } from '@/hooks/crm/types';
import { getApiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';

const selectClass =
  'h-9 rounded-lg border border-ink-200 bg-white px-2.5 text-xs font-semibold text-ink-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200';

const PRIORITY_TONE: Record<CrmFollowupPriority, 'danger' | 'warning' | 'neutral'> = {
  high: 'danger',
  medium: 'warning',
  low: 'neutral',
};

const OBJECT_TYPES: Array<{ value: CrmObjectType; label: string }> = [
  { value: 'contact', label: 'Contact' },
  { value: 'lead', label: 'Lead' },
  { value: 'account', label: 'Account' },
  { value: 'opportunity', label: 'Opportunity' },
];

const FOLLOWUP_TYPES: Array<{ value: CrmFollowupType; label: string }> = [
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'message', label: 'Message' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'check_in', label: 'Check-in' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'contract', label: 'Contract' },
  { value: 'relationship_touch', label: 'Relationship touch' },
  { value: 'custom', label: 'Custom' },
];

const TYPE_LABEL: Record<CrmFollowupType, string> = {
  call: 'Call',
  email: 'Email',
  message: 'Message',
  meeting: 'Meeting',
  check_in: 'Check-in',
  proposal: 'Proposal',
  contract: 'Contract',
  relationship_touch: 'Relationship touch',
  custom: 'Custom',
};

const OBJECT_DETAIL_ROUTE: Record<CrmObjectType, string> = {
  contact: '/app/crm-contact-detail',
  lead: '/app/crm-lead-detail',
  account: '/app/crm-account-detail',
  opportunity: '/app/crm-opportunity-detail',
};

type TabKey = 'due_today' | 'overdue' | 'upcoming' | 'completed';

function AddFollowupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createFollowup = useCreateCrmFollowup();
  const [objectType, setObjectType] = useState<CrmObjectType>('account');
  const [objectId, setObjectId] = useState('');
  const [type, setType] = useState<CrmFollowupType>('call');
  const [dueAt, setDueAt] = useState('');
  const [priority, setPriority] = useState<CrmFollowupPriority>('medium');
  const [reason, setReason] = useState('');

  function reset() {
    setObjectType('account');
    setObjectId('');
    setType('call');
    setDueAt('');
    setPriority('medium');
    setReason('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!objectId.trim() || !dueAt) return;
    await createFollowup.mutateAsync({
      objectType,
      objectId: objectId.trim(),
      type,
      dueAt: new Date(dueAt).toISOString(),
      priority,
      reason: reason || undefined,
    });
    reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} className="max-w-lg" labelledBy="add-followup-title">
      <ModalHeader title="Add follow-up" onClose={() => { reset(); onClose(); }} />
      <form onSubmit={handleSubmit} className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Object type</label>
            <select value={objectType} onChange={(e) => setObjectType(e.target.value as CrmObjectType)} className={cn(selectClass, 'w-full')}>
              {OBJECT_TYPES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Object ID</label>
            <Input value={objectId} onChange={(e) => setObjectId(e.target.value)} placeholder="Record ID" required data-autofocus />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as CrmFollowupType)} className={cn(selectClass, 'w-full')}>
              {FOLLOWUP_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as CrmFollowupPriority)} className={cn(selectClass, 'w-full')}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Due at</label>
          <Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Reason</label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why does this need a follow-up?" />
        </div>
        {createFollowup.isError && <p className="text-sm text-red-600 dark:text-red-400">{getApiErrorMessage(createFollowup.error)}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>
            Cancel
          </Button>
          <Button type="submit" loading={createFollowup.isPending}>
            Add follow-up
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function SnoozeControl({ followup, onDone }: { followup: CrmFollowup; onDone: () => void }) {
  const snoozeFollowup = useSnoozeCrmFollowup();
  const [untilAt, setUntilAt] = useState('');

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <Input
        type="date"
        value={untilAt}
        onChange={(e) => setUntilAt(e.target.value)}
        className="h-8 w-32 text-xs"
      />
      <Button
        variant="outline"
        size="sm"
        disabled={!untilAt || snoozeFollowup.isPending}
        onClick={() => snoozeFollowup.mutate({ id: followup.id, untilAt: new Date(untilAt).toISOString() }, { onSuccess: onDone })}
      >
        Snooze
      </Button>
    </div>
  );
}

export default function CrmFollowupsPage() {
  const [tab, setTab] = useState<TabKey>('due_today');
  const [addOpen, setAddOpen] = useState(false);
  const [snoozingId, setSnoozingId] = useState<string | null>(null);

  const status = tab === 'completed' ? 'done' : 'open';
  const { data, isLoading, isError, error } = useCrmFollowups({ status, limit: 200 });
  const completeFollowup = useCompleteCrmFollowup();

  const followups = data?.data || [];

  const buckets = useMemo(() => {
    const dueToday: CrmFollowup[] = [];
    const overdue: CrmFollowup[] = [];
    const upcoming: CrmFollowup[] = [];
    followups.forEach((f) => {
      const due = new Date(f.due_at);
      if (isToday(due)) dueToday.push(f);
      else if (isPast(due)) overdue.push(f);
      else upcoming.push(f);
    });
    const byDue = (a: CrmFollowup, b: CrmFollowup) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
    return {
      due_today: dueToday.sort(byDue),
      overdue: overdue.sort(byDue),
      upcoming: upcoming.sort(byDue),
      completed: followups.slice().sort((a, b) => new Date(b.completed_at || b.updated_at).getTime() - new Date(a.completed_at || a.updated_at).getTime()),
    };
  }, [followups]);

  const rows = buckets[tab];

  const columns: DataTableColumn<CrmFollowup>[] = [
    {
      key: 'due_at',
      header: 'Due',
      render: (f) => {
        const due = new Date(f.due_at);
        const overdue = f.status === 'open' && isPast(due) && !isToday(due);
        return <span className={cn(overdue ? 'font-semibold text-red-600 dark:text-red-400' : 'text-ink-600 dark:text-ink-300')}>{format(due, 'MMM d, yyyy')}</span>;
      },
    },
    { key: 'priority', header: 'Priority', render: (f) => <Badge tone={PRIORITY_TONE[f.priority]}>{f.priority}</Badge> },
    { key: 'type', header: 'Type', render: (f) => <span className="text-ink-600 dark:text-ink-300">{TYPE_LABEL[f.type]}</span> },
    {
      key: 'related',
      header: 'Related',
      render: (f) => (
        <Link href={`${OBJECT_DETAIL_ROUTE[f.object_type]}?id=${f.object_id}`} onClick={(e) => e.stopPropagation()}>
          <Badge tone="neutral" className="hover:underline">
            {f.object_type}
          </Badge>
        </Link>
      ),
    },
    { key: 'reason', header: 'Reason', render: (f) => <span className="max-w-[220px] truncate text-ink-400 dark:text-ink-500">{f.reason || '—'}</span> },
    {
      key: 'ai_recommended',
      header: 'AI recommended',
      render: (f) =>
        f.ai_recommended ? (
          <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-500/15 dark:text-purple-400">AI</span>
        ) : (
          <span className="text-ink-300">—</span>
        ),
    },
    { key: 'owner', header: 'Owner', render: (f) => <span className="text-ink-500 dark:text-ink-400">{f.owner_user_id ? 'Assigned' : '—'}</span> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (f) => {
        if (f.status === 'done') return <Check className="ml-auto h-4 w-4 text-emerald-500" />;
        return (
          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            <Button variant="outline" size="icon" title="Complete" disabled={completeFollowup.isPending} onClick={() => completeFollowup.mutate(f.id)}>
              <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            </Button>
            {snoozingId === f.id ? (
              <SnoozeControl followup={f} onDone={() => setSnoozingId(null)} />
            ) : (
              <Button variant="outline" size="icon" title="Snooze" onClick={() => setSnoozingId(f.id)}>
                <Clock className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
            <CalendarClock className="h-5 w-5 text-brand-600" /> Follow-Ups
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Relationship-focused reminders — never let an account or opportunity go quiet.</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Add follow-up
        </Button>
      </div>

      <CrmLocalNav active="followups" />

      <Tabs
        value={tab}
        onChange={(k) => setTab(k as TabKey)}
        tabs={[
          { key: 'due_today', label: 'Due today', count: buckets.due_today.length },
          { key: 'overdue', label: 'Overdue', count: buckets.overdue.length },
          { key: 'upcoming', label: 'Upcoming', count: buckets.upcoming.length },
          { key: 'completed', label: 'Completed', count: buckets.completed.length },
        ]}
      />

      {isError && (
        <Card className="py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load follow-ups</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      )}

      {!isError && (
        <DataTable
          columns={columns}
          data={rows}
          rowKey={(f) => f.id}
          isLoading={isLoading}
          emptyTitle={tab === 'completed' ? 'No completed follow-ups' : 'Nothing here'}
          emptyDescription={
            tab === 'due_today'
              ? 'No follow-ups are due today.'
              : tab === 'overdue'
                ? 'You are all caught up — nothing overdue.'
                : tab === 'upcoming'
                  ? 'No upcoming follow-ups scheduled.'
                  : 'Completed follow-ups will show up here.'
          }
        />
      )}

      <AddFollowupModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
