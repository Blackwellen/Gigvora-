'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ClipboardList, Loader2, Plus, Trash2, UserRound, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { Drawer } from '@/components/ui/Drawer';
import { RecruiterSeatGate } from '@/components/recruiter/RecruiterSeatGate';
import {
  useAddShortlistMember,
  useCreateShortlist,
  useRecruiterShortlist,
  useRecruiterShortlists,
  useRemoveShortlistMember,
} from '@/hooks/recruiter/useRecruiterShortlists';
import { useRecruiterProjects } from '@/hooks/recruiter/useRecruiterProjects';
import type { RecruiterShortlist } from '@/hooks/recruiter/types';
import { getApiErrorMessage } from '@/lib/api';

function ShortlistCard({ shortlist, projectName, onOpen }: { shortlist: RecruiterShortlist; projectName?: string; onOpen: () => void }) {
  return (
    <div role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => e.key === 'Enter' && onOpen()}>
      <Card className="cursor-pointer p-4 transition-colors hover:border-brand-200 dark:hover:border-brand-500/40">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink-900 dark:text-white">{shortlist.name}</p>
            {shortlist.description && <p className="mt-0.5 line-clamp-2 text-xs text-ink-500 dark:text-ink-400">{shortlist.description}</p>}
          </div>
          <Badge tone={shortlist.status === 'active' ? 'success' : 'neutral'}>{shortlist.status}</Badge>
        </div>
        {projectName && (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-ink-500 dark:text-ink-400">
            <ClipboardList className="h-3.5 w-3.5" /> {projectName}
          </p>
        )}
      </Card>
    </div>
  );
}

function AddMemberForm({ shortlistId, nextRank }: { shortlistId: string; nextRank: number }) {
  const addMember = useAddShortlistMember(shortlistId);
  const [form, setForm] = useState({ candidate_name: '', notes: '' });
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.candidate_name.trim()) return;
    setErr(null);
    try {
      await addMember.mutateAsync({ candidate_name: form.candidate_name, notes: form.notes || undefined, rank: nextRank });
      setForm({ candidate_name: '', notes: '' });
      setOpen(false);
    } catch (e2) {
      setErr(getApiErrorMessage(e2));
    }
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" /> Add candidate
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded-xl border border-ink-100 p-3 dark:border-ink-800">
      <Input value={form.candidate_name} onChange={(e) => setForm((p) => ({ ...p, candidate_name: e.target.value }))} placeholder="Candidate name" required />
      <textarea
        value={form.notes}
        onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
        rows={2}
        placeholder="Notes (optional)"
        className="w-full rounded-control border border-ink-200 bg-white p-2.5 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-white"
      />
      {err && <p className="text-xs text-red-600 dark:text-red-400">{err}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={addMember.isPending} disabled={!form.candidate_name.trim()}>
          Add
        </Button>
      </div>
    </form>
  );
}

function ShortlistDrawer({ shortlistId, onClose }: { shortlistId: string | null; onClose: () => void }) {
  const { data: shortlist, isLoading, isError, error } = useRecruiterShortlist(shortlistId || undefined);
  const removeMember = useRemoveShortlistMember(shortlistId || undefined);
  const members = shortlist?.members || [];

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
          <div className="space-y-5">
            {shortlist.description && <p className="text-sm text-ink-600 dark:text-ink-300">{shortlist.description}</p>}

            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink-900 dark:text-white">Ranked candidates ({members.length})</p>
              <AddMemberForm shortlistId={shortlist.id} nextRank={members.length + 1} />
            </div>

            {members.length === 0 ? (
              <Card className="border-dashed py-10 text-center">
                <p className="text-sm text-ink-400 dark:text-ink-500">No candidates shortlisted yet.</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {members.map((m) => (
                  <Card key={m.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start gap-2">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-400">
                          {m.rank ?? '—'}
                        </span>
                        <div className="min-w-0">
                          {m.candidate_id ? (
                            <Link href={`/app/candidate-detail?candidateId=${m.candidate_id}`} className="truncate text-sm font-semibold text-ink-900 hover:text-brand-600 dark:text-white dark:hover:text-brand-400">
                              {m.candidate_name}
                            </Link>
                          ) : (
                            <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{m.candidate_name}</p>
                          )}
                          <p className="mt-0.5 text-xs text-ink-400 dark:text-ink-500">Added {format(new Date(m.added_at), 'MMM d, yyyy')}</p>
                          {m.notes && <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">{m.notes}</p>}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMember.mutate(m.id)}
                        disabled={removeMember.isPending}
                        className="shrink-0 rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                        aria-label={`Remove ${m.candidate_name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </Card>
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
  const { data: projectsData } = useRecruiterProjects('active');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const projects = projectsData?.data || [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setErr(null);
    try {
      await createShortlist.mutateAsync({ name, description: description || undefined, project_id: projectId || undefined });
      setName('');
      setDescription('');
      setProjectId('');
      onClose();
    } catch (e2) {
      setErr(getApiErrorMessage(e2));
    }
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="new-shortlist-title" className="max-w-md">
      <ModalHeader title="New shortlist" onClose={onClose} />
      <form onSubmit={handleSubmit} className="space-y-3 p-5">
        <Input data-autofocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Shortlist name" required />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Description (optional)"
          className="w-full rounded-control border border-ink-200 bg-white p-3 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-white"
        />
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Link to project (optional)</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="h-10 w-full rounded-control border border-ink-200 bg-white px-3 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
          >
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        {err && <p className="text-sm text-red-600 dark:text-red-400">{err}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={createShortlist.isPending} disabled={!name.trim()}>
            Create shortlist
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ShortlistsInner() {
  const { data, isLoading, isError, error } = useRecruiterShortlists();
  const { data: projectsData } = useRecruiterProjects();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const shortlists = data?.data || [];
  const projectNameById = Object.fromEntries((projectsData?.data || []).map((p) => [p.id, p.name]));

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
            <ClipboardList className="h-5 w-5 text-brand-600" /> Shortlists
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Ranked candidate shortlists for the roles you're actively recruiting for.</p>
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
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">Create a shortlist to rank your top candidates for a role.</p>
          <Button size="sm" className="mt-4" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New shortlist
          </Button>
        </Card>
      )}

      {!isLoading && !isError && shortlists.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shortlists.map((s) => (
            <ShortlistCard key={s.id} shortlist={s} projectName={s.project_id ? projectNameById[s.project_id] : undefined} onOpen={() => setSelectedId(s.id)} />
          ))}
        </div>
      )}

      <NewShortlistModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <ShortlistDrawer shortlistId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

export default function RecruiterShortlistsPage() {
  return (
    <RecruiterSeatGate>
      <ShortlistsInner />
    </RecruiterSeatGate>
  );
}
