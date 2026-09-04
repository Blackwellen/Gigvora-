'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Layers, Loader2, Plus, Trash2, UserRound, Users, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { Drawer } from '@/components/ui/Drawer';
import { RecruiterSeatGate } from '@/components/recruiter/RecruiterSeatGate';
import {
  useAddTalentPoolMember,
  useCreateTalentPool,
  useRecruiterTalentPool,
  useRecruiterTalentPools,
  useRemoveTalentPoolMember,
} from '@/hooks/recruiter/useRecruiterTalentPools';
import type { RecruiterTalentPool } from '@/hooks/recruiter/types';
import { getApiErrorMessage } from '@/lib/api';

function PoolCard({ pool, onOpen }: { pool: RecruiterTalentPool; onOpen: () => void }) {
  return (
    <div role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => e.key === 'Enter' && onOpen()}>
      <Card className="cursor-pointer p-4 transition-colors hover:border-brand-200 dark:hover:border-brand-500/40">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink-900 dark:text-white">{pool.name}</p>
            {pool.description && <p className="mt-0.5 line-clamp-2 text-xs text-ink-500 dark:text-ink-400">{pool.description}</p>}
          </div>
          <Badge tone={pool.status === 'active' ? 'success' : 'neutral'}>{pool.status}</Badge>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs font-semibold text-ink-500 dark:text-ink-400">
            <Users className="h-3.5 w-3.5" /> {pool.member_count} candidate{pool.member_count === 1 ? '' : 's'}
          </span>
        </div>
        {pool.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {pool.tags.map((tag) => (
              <Badge key={tag} tone="neutral">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function AddMemberForm({ poolId }: { poolId: string }) {
  const addMember = useAddTalentPoolMember(poolId);
  const [form, setForm] = useState({ candidate_name: '', candidate_email: '', notes: '' });
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.candidate_name.trim()) return;
    setErr(null);
    try {
      await addMember.mutateAsync({
        candidate_name: form.candidate_name,
        candidate_email: form.candidate_email || undefined,
        notes: form.notes || undefined,
      });
      setForm({ candidate_name: '', candidate_email: '', notes: '' });
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
      <div className="grid grid-cols-2 gap-2">
        <Input value={form.candidate_name} onChange={(e) => setForm((p) => ({ ...p, candidate_name: e.target.value }))} placeholder="Candidate name" required />
        <Input value={form.candidate_email} onChange={(e) => setForm((p) => ({ ...p, candidate_email: e.target.value }))} placeholder="Email (optional)" />
      </div>
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

function PoolDrawer({ poolId, onClose }: { poolId: string | null; onClose: () => void }) {
  const { data: pool, isLoading, isError, error } = useRecruiterTalentPool(poolId || undefined);
  const removeMember = useRemoveTalentPoolMember(poolId || undefined);

  return (
    <Drawer open={Boolean(poolId)} onClose={onClose} labelledBy="pool-drawer-title" width="w-[480px]">
      <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4 dark:border-ink-800">
        <h2 id="pool-drawer-title" className="font-display text-base font-bold text-ink-900 dark:text-white">
          {pool?.name || 'Talent pool'}
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
        {pool && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Badge tone={pool.status === 'active' ? 'success' : 'neutral'}>{pool.status}</Badge>
            </div>
            {pool.description && <p className="text-sm text-ink-600 dark:text-ink-300">{pool.description}</p>}

            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink-900 dark:text-white">Candidates ({pool.members?.length || 0})</p>
              <AddMemberForm poolId={pool.id} />
            </div>

            {!pool.members || pool.members.length === 0 ? (
              <Card className="border-dashed py-10 text-center">
                <p className="text-sm text-ink-400 dark:text-ink-500">No candidates in this pool yet.</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {pool.members.map((m) => (
                  <Card key={m.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start gap-2">
                        <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
                        <div className="min-w-0">
                          {m.candidate_id ? (
                            <Link href={`/app/candidate-detail?candidateId=${m.candidate_id}`} className="truncate text-sm font-semibold text-ink-900 hover:text-brand-600 dark:text-white dark:hover:text-brand-400">
                              {m.candidate_name}
                            </Link>
                          ) : (
                            <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{m.candidate_name}</p>
                          )}
                          {m.candidate_email && <p className="truncate text-xs text-ink-400 dark:text-ink-500">{m.candidate_email}</p>}
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-500 dark:text-ink-400">
                            {m.match_score != null && <span className="font-semibold">{Math.round(m.match_score)}% match</span>}
                            <span>Added {format(new Date(m.added_at), 'MMM d, yyyy')}</span>
                          </div>
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

function NewPoolModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createPool = useCreateTalentPool();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setErr(null);
    try {
      await createPool.mutateAsync({ name, description: description || undefined, tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean) });
      setName('');
      setDescription('');
      setTagsInput('');
      onClose();
    } catch (e2) {
      setErr(getApiErrorMessage(e2));
    }
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="new-pool-title" className="max-w-md">
      <ModalHeader title="New talent pool" onClose={onClose} />
      <form onSubmit={handleSubmit} className="space-y-3 p-5">
        <Input data-autofocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Pool name" required />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Description (optional)"
          className="w-full rounded-control border border-ink-200 bg-white p-3 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-white"
        />
        <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="Tags, comma separated (optional)" />
        {err && <p className="text-sm text-red-600 dark:text-red-400">{err}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={createPool.isPending} disabled={!name.trim()}>
            Create pool
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function TalentPoolsInner() {
  const { data, isLoading, isError, error } = useRecruiterTalentPools();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const pools = data?.data || [];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
            <Layers className="h-5 w-5 text-brand-600" /> Talent Pools
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Your personal candidate pools — sourced, referred, or held back for future roles you're recruiting for.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New pool
        </Button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {isError && (
        <Card className="py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load talent pools</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      )}

      {!isLoading && !isError && pools.length === 0 && (
        <Card className="border-dashed py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No talent pools yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">Create a pool to start holding candidates for future roles.</p>
          <Button size="sm" className="mt-4" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New pool
          </Button>
        </Card>
      )}

      {!isLoading && !isError && pools.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pools.map((pool) => (
            <PoolCard key={pool.id} pool={pool} onOpen={() => setSelectedId(pool.id)} />
          ))}
        </div>
      )}

      <NewPoolModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <PoolDrawer poolId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

export default function RecruiterTalentPoolsPage() {
  return (
    <RecruiterSeatGate>
      <TalentPoolsInner />
    </RecruiterSeatGate>
  );
}
