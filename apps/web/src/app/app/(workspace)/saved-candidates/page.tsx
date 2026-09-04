'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Bookmark, Loader2, MapPin, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { RecruiterSeatGate } from '@/components/recruiter/RecruiterSeatGate';
import { useCandidateSaves, useRemoveCandidateSave, useUpdateCandidateSave } from '@/hooks/recruiter/useCandidateSaves';
import type { CandidateSave } from '@/hooks/recruiter/types';
import { getApiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';

const STATUS_TABS: Array<{ key: 'all' | CandidateSave['status']; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'saved', label: 'Saved' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'archived', label: 'Archived' },
];

const STATUS_TONE: Record<CandidateSave['status'], 'brand' | 'success' | 'neutral'> = {
  saved: 'brand',
  contacted: 'success',
  archived: 'neutral',
};

function SavedCandidatesInner() {
  const [statusFilter, setStatusFilter] = useState<'all' | CandidateSave['status']>('all');
  const { data, isLoading, isError, error } = useCandidateSaves(statusFilter === 'all' ? {} : { status: statusFilter });
  const updateSave = useUpdateCandidateSave();
  const removeSave = useRemoveCandidateSave();
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const saves = data?.data || [];

  async function handleStatusChange(save: CandidateSave, status: CandidateSave['status']) {
    setErrMsg(null);
    try {
      await updateSave.mutateAsync({ id: save.id, status });
    } catch (e) {
      setErrMsg(getApiErrorMessage(e));
    }
  }

  const columns: DataTableColumn<CandidateSave>[] = [
    {
      key: 'name',
      header: 'Candidate',
      render: (row) => (
        <Link href={`/app/candidate-detail?candidateId=${row.candidate_id}`} className="flex items-center gap-3 hover:text-brand-600 dark:hover:text-brand-400">
          <Avatar name={row.name} src={row.avatar_url} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink-900 dark:text-white">{row.name}</p>
            {row.headline && <p className="truncate text-xs text-ink-500 dark:text-ink-400">{row.headline}</p>}
          </div>
        </Link>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (row) =>
        row.location ? (
          <span className="flex items-center gap-1 text-sm text-ink-600 dark:text-ink-300">
            <MapPin className="h-3.5 w-3.5 text-ink-400" /> {row.location}
          </span>
        ) : (
          <span className="text-ink-400">—</span>
        ),
    },
    {
      key: 'availability',
      header: 'Availability',
      render: (row) => (row.open_to_work ? <Badge tone="success">Open to work</Badge> : <span className="text-xs text-ink-400 dark:text-ink-500">Not looking</span>),
    },
    {
      key: 'note',
      header: 'Note',
      render: (row) => <p className="max-w-[260px] truncate text-sm text-ink-500 dark:text-ink-400">{row.note || '—'}</p>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <select
          value={row.status}
          onChange={(e) => handleStatusChange(row, e.target.value as CandidateSave['status'])}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'h-7 rounded-full border-0 px-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/30',
            row.status === 'saved' && 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400',
            row.status === 'contacted' && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
            row.status === 'archived' && 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'
          )}
        >
          <option value="saved">Saved</option>
          <option value="contacted">Contacted</option>
          <option value="archived">Archived</option>
        </select>
      ),
    },
    {
      key: 'saved_at',
      header: 'Saved',
      render: (row) => <span className="text-xs text-ink-400 dark:text-ink-500">{format(new Date(row.saved_at), 'MMM d, yyyy')}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            removeSave.mutate(row.id);
          }}
          disabled={removeSave.isPending}
          className="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          aria-label={`Remove ${row.name} from saved candidates`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 lg:px-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
          <Bookmark className="h-5 w-5 text-brand-600" /> Saved Candidates
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Candidates you've saved from Candidate Search — track status and revisit their profile any time.</p>
      </div>

      <div className="flex items-center gap-1 border-b border-ink-100 dark:border-ink-800">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setStatusFilter(tab.key)}
            className={cn(
              'px-3.5 py-2.5 font-display text-sm font-semibold tracking-[-0.01em] transition-colors',
              statusFilter === tab.key ? 'border-b-2 border-brand-600 text-brand-700 dark:text-brand-400' : 'text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-100'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {errMsg && <p className="text-sm text-red-600 dark:text-red-400">{errMsg}</p>}

      {isError ? (
        <Card className="py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load saved candidates</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={saves}
          rowKey={(row) => row.id}
          isLoading={isLoading}
          emptyTitle="No saved candidates yet"
          emptyDescription="Save candidates from Candidate Search to build your shortlist here."
          emptyAction={
            <Link href="/app/candidate-search" className="text-sm font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-400">
              Go to Candidate Search
            </Link>
          }
        />
      )}
    </div>
  );
}

export default function SavedCandidatesPage() {
  return (
    <RecruiterSeatGate>
      <SavedCandidatesInner />
    </RecruiterSeatGate>
  );
}
