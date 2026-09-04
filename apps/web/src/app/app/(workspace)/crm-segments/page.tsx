'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Layers, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { CrmLocalNav } from '@/components/crm/CrmLocalNav';
import { SegmentRuleBuilder } from '@/components/crm/SegmentRuleBuilder';
import { useCrmSegments, useCreateCrmSegment, useRecalculateCrmSegment, useDeleteCrmSegment } from '@/hooks/crm/useCrmSegments';
import type { CrmSegment, CrmSegmentObjectType, CrmSegmentRuleInput } from '@/hooks/crm/types';
import { getApiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';

const PAGE_SIZE = 20;

const selectClass =
  'h-9 rounded-lg border border-ink-200 bg-white px-2.5 text-xs font-semibold text-ink-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200';

const OBJECT_TYPES: Array<{ value: CrmSegmentObjectType; label: string }> = [
  { value: 'contact', label: 'Contact' },
  { value: 'lead', label: 'Lead' },
  { value: 'account', label: 'Account' },
];

function CreateSegmentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createSegment = useCreateCrmSegment();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [objectType, setObjectType] = useState<CrmSegmentObjectType>('contact');
  const [rules, setRules] = useState<CrmSegmentRuleInput[]>([]);

  function reset() {
    setName('');
    setDescription('');
    setObjectType('contact');
    setRules([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await createSegment.mutateAsync({
      name: name.trim(),
      description: description || undefined,
      objectType,
      rules: rules.filter((r) => r.field && r.operator),
    });
    reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} className="max-w-2xl" labelledBy="create-segment-title">
      <ModalHeader title="Create segment" onClose={() => { reset(); onClose(); }} />
      <form onSubmit={handleSubmit} className="max-h-[75vh] space-y-4 overflow-y-auto p-5">
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. High-intent enterprise leads" required data-autofocus />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Description</label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this segment for?" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Object type</label>
          <select
            value={objectType}
            onChange={(e) => {
              setObjectType(e.target.value as CrmSegmentObjectType);
              setRules([]);
            }}
            className={cn(selectClass, 'w-full')}
          >
            {OBJECT_TYPES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Rules</label>
          <SegmentRuleBuilder objectType={objectType} rules={rules} onChange={setRules} />
        </div>
        {createSegment.isError && <p className="text-sm text-red-600 dark:text-red-400">{getApiErrorMessage(createSegment.error)}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>
            Cancel
          </Button>
          <Button type="submit" loading={createSegment.isPending}>
            Create segment
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function CrmSegmentsPage() {
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError, error } = useCrmSegments({ limit: PAGE_SIZE, offset: page * PAGE_SIZE });
  const recalculate = useRecalculateCrmSegment();
  const deleteSegment = useDeleteCrmSegment();

  const segments = data?.data || [];
  const total = data?.meta.total ?? 0;
  const hasNext = (page + 1) * PAGE_SIZE < total;

  const columns: DataTableColumn<CrmSegment>[] = useMemo(
    () => [
      { key: 'name', header: 'Name', render: (s) => <span className="font-semibold text-ink-900 dark:text-white">{s.name}</span> },
      { key: 'segment_type', header: 'Type', render: (s) => <Badge tone={s.segment_type === 'dynamic' ? 'brand' : 'neutral'}>{s.segment_type === 'dynamic' ? 'Dynamic' : 'Static'}</Badge> },
      { key: 'object_type', header: 'Objects', render: (s) => <Badge tone="neutral">{s.object_type}</Badge> },
      { key: 'member_count_cached', header: 'Members', align: 'right', render: (s) => <span className="font-semibold text-ink-900 dark:text-white">{s.member_count_cached}</span> },
      {
        key: 'last_recalculated_at',
        header: 'Last recalculated',
        render: (s) => <span className="text-ink-500 dark:text-ink-400">{s.last_recalculated_at ? format(new Date(s.last_recalculated_at), 'MMM d, yyyy') : 'Never'}</span>,
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (s) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="outline"
              size="icon"
              title="Recalculate"
              disabled={recalculate.isPending}
              onClick={() => recalculate.mutate(s.id)}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', recalculate.isPending && recalculate.variables === s.id && 'animate-spin')} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              title="Delete"
              disabled={deleteSegment.isPending}
              onClick={() => {
                if (confirm(`Delete segment "${s.name}"? This cannot be undone.`)) deleteSegment.mutate(s.id);
              }}
            >
              <Trash2 className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
            </Button>
          </div>
        ),
      },
    ],
    [recalculate, deleteSegment]
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
            <Layers className="h-5 w-5 text-brand-600" /> Segments
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Dynamic and static audiences built from rules over your contacts, leads, and accounts.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Create segment
        </Button>
      </div>

      <CrmLocalNav active="segments" />

      {isError && (
        <Card className="py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load segments</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      )}

      {!isError && (
        <DataTable
          columns={columns}
          data={segments}
          rowKey={(s) => s.id}
          isLoading={isLoading}
          emptyTitle="No segments yet"
          emptyDescription="Create a segment to group contacts, leads, or accounts by shared attributes."
        />
      )}

      {!isLoading && !isError && segments.length > 0 && (
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

      <CreateSegmentModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
