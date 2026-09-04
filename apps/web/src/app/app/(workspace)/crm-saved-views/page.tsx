'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Bookmark, Copy, Loader2, Star, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { CrmLocalNav } from '@/components/crm/CrmLocalNav';
import {
  useCrmSavedViews,
  useCreateCrmSavedView,
  useDeleteCrmSavedView,
  useDuplicateCrmSavedView,
  useSetDefaultCrmSavedView,
} from '@/hooks/crm/useCrmSavedViews';
import type { CrmSavedView, CrmSavedViewObjectType, CrmSavedViewVisibility } from '@/hooks/crm/types';
import { getApiErrorMessage } from '@/lib/api';

const selectClass =
  'h-9 rounded-lg border border-ink-200 bg-white px-2.5 text-xs font-semibold text-ink-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200';

const OBJECT_TYPE_OPTIONS: { value: CrmSavedViewObjectType | 'all'; label: string }[] = [
  { value: 'all', label: 'All objects' },
  { value: 'contact', label: 'Contacts' },
  { value: 'lead', label: 'Leads' },
  { value: 'account', label: 'Accounts' },
  { value: 'opportunity', label: 'Opportunities' },
];

const VISIBILITY_TONE: Record<CrmSavedViewVisibility, 'brand' | 'neutral'> = {
  workspace: 'brand',
  team: 'neutral',
  private: 'neutral',
};

function NewSavedViewModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [objectType, setObjectType] = useState<CrmSavedViewObjectType>('contact');
  const [viewMode, setViewMode] = useState('table');
  const createView = useCreateCrmSavedView();

  function handleClose() {
    setName('');
    setObjectType('contact');
    setViewMode('table');
    createView.reset();
    onClose();
  }

  async function handleCreate() {
    if (!name.trim()) return;
    await createView.mutateAsync({
      name: name.trim(),
      objectType,
      viewMode,
      filterJson: {},
      sortJson: {},
      columnJson: [],
    });
    handleClose();
  }

  return (
    <Modal open={open} onClose={handleClose} labelledBy="new-saved-view-title" className="max-w-md">
      <ModalHeader title="New saved view" onClose={handleClose} />
      <div className="space-y-4 p-5">
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. My open opportunities" data-autofocus />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Object</label>
          <select value={objectType} onChange={(e) => setObjectType(e.target.value as CrmSavedViewObjectType)} className={`${selectClass} w-full`}>
            <option value="contact">Contacts</option>
            <option value="lead">Leads</option>
            <option value="account">Accounts</option>
            <option value="opportunity">Opportunities</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">View mode</label>
          <select value={viewMode} onChange={(e) => setViewMode(e.target.value)} className={`${selectClass} w-full`}>
            <option value="table">Table</option>
            <option value="card">Card</option>
          </select>
        </div>
        {createView.isError && <p className="text-sm text-red-600 dark:text-red-400">{getApiErrorMessage(createView.error)}</p>}
      </div>
      <div className="flex justify-end gap-2 border-t border-ink-100 px-5 py-4 dark:border-ink-800">
        <Button variant="outline" size="sm" onClick={handleClose}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleCreate} disabled={!name.trim()} loading={createView.isPending}>
          Create view
        </Button>
      </div>
    </Modal>
  );
}

export default function CrmSavedViewsPage() {
  const [objectType, setObjectType] = useState<CrmSavedViewObjectType | 'all'>('all');
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading, isError, error } = useCrmSavedViews(objectType === 'all' ? {} : { objectType });
  const views = data?.data || [];

  const setDefault = useSetDefaultCrmSavedView();
  const duplicateView = useDuplicateCrmSavedView();
  const deleteView = useDeleteCrmSavedView();

  const columns: DataTableColumn<CrmSavedView>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (v) => <span className="font-semibold text-ink-900 dark:text-white">{v.name}</span>,
    },
    {
      key: 'object_type',
      header: 'Object',
      render: (v) => <Badge tone="neutral">{v.object_type}</Badge>,
    },
    {
      key: 'visibility',
      header: 'Visibility',
      render: (v) => <Badge tone={VISIBILITY_TONE[v.visibility]}>{v.visibility}</Badge>,
    },
    {
      key: 'view_mode',
      header: 'View mode',
      render: (v) => <span className="capitalize text-ink-600 dark:text-ink-300">{v.view_mode}</span>,
    },
    {
      key: 'is_default',
      header: 'Default',
      align: 'center',
      render: (v) => (v.is_default ? <Star className="mx-auto h-4 w-4 fill-amber-400 text-amber-400" /> : <span className="text-ink-300">—</span>),
    },
    {
      key: 'updated_at',
      header: 'Updated',
      render: (v) => <span className="text-ink-500 dark:text-ink-400">{format(new Date(v.updated_at), 'MMM d, yyyy')}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (v) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            size="sm"
            disabled={v.is_default}
            loading={setDefault.isPending && setDefault.variables === v.id}
            onClick={() => setDefault.mutate(v.id)}
          >
            Set default
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Duplicate view"
            loading={duplicateView.isPending && duplicateView.variables === v.id}
            onClick={() => duplicateView.mutate(v.id)}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Delete view"
            loading={deleteView.isPending && deleteView.variables === v.id}
            onClick={() => {
              if (confirm(`Delete saved view "${v.name}"? This cannot be undone.`)) {
                deleteView.mutate(v.id);
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
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
            <Bookmark className="h-5 w-5 text-brand-600" /> Saved Views
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Reusable filter, sort, and column configurations shared across your CRM collections.</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          + New view
        </Button>
      </div>

      <CrmLocalNav active="savedViews" />

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={objectType}
            onChange={(e) => setObjectType(e.target.value as CrmSavedViewObjectType | 'all')}
            aria-label="Filter by object type"
            className={selectClass}
          >
            {OBJECT_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {isError && !isLoading && (
        <Card className="py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&apos;t load saved views</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      )}

      {!isLoading && !isError && (
        <DataTable
          columns={columns}
          data={views}
          rowKey={(v) => v.id}
          emptyTitle="No saved views yet"
          emptyDescription="Save a filter, sort, and column configuration from any CRM collection page, or create one here to get started."
        />
      )}

      <NewSavedViewModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
