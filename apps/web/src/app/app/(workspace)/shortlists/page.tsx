'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ArrowDown, ArrowUp, ListChecks, Loader2, Plus, Trash2, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { Drawer } from '@/components/ui/Drawer';
import {
  useCreateShortlist,
  useRemoveShortlistMember,
  useShortlist,
  useShortlists,
  useUpdateShortlistMember,
} from '@/hooks/business/useShortlists';
import type { Shortlist, ShortlistInput, ShortlistMember } from '@/hooks/business/types';
import { useJobs } from '@/hooks/jobs/useJobs';
import { getApiErrorMessage } from '@/lib/api';

function ShortlistCard({ shortlist, onOpen }: { shortlist: Shortlist; onOpen: () => void }) {
  return (
    <div role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => e.key === 'Enter' && onOpen()} className="text-left">
    <Card className="cursor-pointer p-4 transition-colors hover:border-brand-200 dark:hover:border-brand-500/40">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink-900 dark:text-white">{shortlist.name}</p>
          {shortlist.job_title ? (
            <p className="mt-0.5 truncate text-xs text-ink-500 dark:text-ink-400">For {shortlist.job_title}</p>
          ) : (
            <p className="mt-0.5 text-xs text-ink-400 dark:text-ink-500">Not linked to a job</p>
          )}
        </div>
        <Badge tone={shortlist.status === 'active' ? 'success' : 'neutral'}>{shortlist.status}</Badge>
      </div>
      {shortlist.description && <p className="mt-2 line-clamp-2 text-xs text-ink-500 dark:text-ink-400">{shortlist.description}</p>}
      <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-ink-500 dark:text-ink-400">
        <ListChecks className="h-3.5 w-3.5" /> {shortlist.member_count} candidate{shortlist.member_count === 1 ? '' : 's'}
      </div>
    </Card>
    </div>
  );
}

function MemberRow({
  member,
  index,
  total,
  shortlistId,
}: {
  member: ShortlistMember;
  index: number;
  total: number;
  shortlistId: string;
}) {
  const updateMember = useUpdateShortlistMember(shortlistId);
  const removeMember = useRemoveShortlistMember(shortlistId);

  function move(direction: -1 | 1) {
    updateMember.mutate({ memberId: member.id, rank: member.rank + direction });
  }

  return (
    <Card className="p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-400">
            {member.rank}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{member.candidate_name}</p>
            {member.notes && <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{member.notes}</p>}
            <p className="mt-0.5 text-xs text-ink-400 dark:text-ink-500">Added {format(new Date(member.added_at), 'MMM d, yyyy')}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => move(-1)}
            disabled={index === 0 || updateMember.isPending}
            className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 disabled:opacity-30 dark:hover:bg-ink-800 dark:hover:text-ink-100"
            aria-label="Move up"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            disabled={index === total - 1 || updateMember.isPending}
            className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 disabled:opacity-30 dark:hover:bg-ink-800 dark:hover:text-ink-100"
            aria-label="Move down"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => removeMember.mutate(member.id)}
            disabled={removeMember.isPending}
            className="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            aria-label={`Remove ${member.candidate_name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </Card>
  );
}

function ShortlistDrawer({ shortlistId, onClose }: { shortlistId: string | null; onClose: () => void }) {
  const { data: shortlist, isLoading, isError, error } = useShortlist(shortlistId || undefined);

  const sortedMembers = [...(shortlist?.members || [])].sort((a, b) => a.rank - b.rank);

  return (
    <Drawer open={Boolean(shortlistId)} onClose={onClose} labelledBy="shortlist-drawer-title" width="w-[480px]">
      <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4 dark:border-ink-800">
        <h2 id="shortlist-drawer-title" className="font-display text-base font-bold text-ink-900 dark:text-white">
          {shortlist?.name || 'Shortlist'}
        </h2>
        <button type="button" onClick={onClose} className="rounded-full p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-ink-100" aria-label="Close">
          <X className="h-4.5 w-4.5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        )}
        {isError && <p className="text-sm text-red-600 dark:text-red-400">{getApiErrorMessage(error)}</p>}
        {shortlist && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge tone={shortlist.status === 'active' ? 'success' : 'neutral'}>{shortlist.status}</Badge>
              {shortlist.job_title && <Badge tone="brand">{shortlist.job_title}</Badge>}
            </div>
            {shortlist.description && <p className="text-sm text-ink-600 dark:text-ink-300">{shortlist.description}</p>}

            <p className="text-sm font-semibold text-ink-900 dark:text-white">Ranked candidates ({sortedMembers.length})</p>

            {sortedMembers.length === 0 ? (
              <Card className="border-dashed py-10 text-center">
                <p className="text-sm text-ink-400 dark:text-ink-500">No candidates on this shortlist yet.</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {sortedMembers.map((m, i) => (
                  <MemberRow key={m.id} member={m} index={i} total={sortedMembers.length} shortlistId={shortlist.id} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
}

function NewShortlistModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createShortlist = useCreateShortlist();
  const { data: jobsData } = useJobs({ limit: 100 });
  const jobs = jobsData?.data || [];
  const [form, setForm] = useState<ShortlistInput>({ name: '' });
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setErr(null);
    try {
      await createShortlist.mutateAsync(form);
      setForm({ name: '' });
      onClose();
    } catch (e2) {
      setErr(getApiErrorMessage(e2));
    }
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="new-shortlist-title" className="max-w-md">
      <ModalHeader title="New shortlist" onClose={onClose} />
      <form onSubmit={handleSubmit} className="space-y-3 p-5">
        <Input data-autofocus value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Shortlist name" required />
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Linked job (optional)</label>
          <select
            value={form.job_id || ''}
            onChange={(e) => setForm((p) => ({ ...p, job_id: e.target.value || undefined }))}
            className="h-10 w-full rounded-control border border-ink-200 bg-white px-3 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
          >
            <option value="">No linked job</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
        </div>
        <textarea
          value={form.description || ''}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value || undefined }))}
          rows={2}
          placeholder="Description (optional)"
          className="w-full rounded-control border border-ink-200 bg-white p-3 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-white"
        />
        {err && <p className="text-sm text-red-600 dark:text-red-400">{err}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={createShortlist.isPending} disabled={!form.name.trim()}>
            Create shortlist
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function ShortlistsPage() {
  const { data, isLoading, isError, error } = useShortlists();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const shortlists = data?.data || [];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
            <ListChecks className="h-5 w-5 text-brand-600" /> Shortlists
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Curated, ranked candidate lists for a role — build consensus before moving to interviews.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New shortlist
        </Button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {isError && (
        <Card className="py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load shortlists</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      )}

      {!isLoading && !isError && shortlists.length === 0 && (
        <Card className="border-dashed py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No shortlists yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">Create a shortlist to rank your strongest candidates for a role.</p>
          <Button size="sm" className="mt-4" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New shortlist
          </Button>
        </Card>
      )}

      {!isLoading && !isError && shortlists.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shortlists.map((s) => (
            <ShortlistCard key={s.id} shortlist={s} onOpen={() => setSelectedId(s.id)} />
          ))}
        </div>
      )}

      <NewShortlistModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <ShortlistDrawer shortlistId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
