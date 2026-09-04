'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Loader2, Plus, Trash2, UserMinus, Users2, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Drawer } from '@/components/ui/Drawer';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import {
  useAddTeamMember,
  useArchiveTeam,
  useCreateTeam,
  useRemoveTeamMember,
  useTeam,
  useTeams,
  type TeamInput,
} from '@/hooks/business/useTeams';
import { useDepartments } from '@/hooks/business/useDepartments';
import { getApiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { Team } from '@/hooks/business/types';

const selectClass =
  'h-9 rounded-lg border border-ink-200 bg-white px-2.5 text-xs font-semibold text-ink-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200';

function utilisationTone(pct: number | null): 'success' | 'warning' | 'danger' | 'neutral' {
  if (pct === null) return 'neutral';
  if (pct > 95) return 'danger';
  if (pct >= 80) return 'warning';
  return 'success';
}

export default function TeamsPage() {
  const [departmentId, setDepartmentId] = useState('');
  const [status, setStatus] = useState('active');
  const [q, setQ] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const filter = useMemo(
    () => ({ department_id: departmentId || undefined, status: status || undefined, q: q || undefined }),
    [departmentId, status, q]
  );

  const { data, isLoading, isError, error } = useTeams(filter);
  const { data: deptData } = useDepartments({ status: 'active' });
  const teams = data?.data || [];
  const departments = deptData?.data || [];

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-5 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
            <Users2 className="h-5 w-5" /> Teams
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Rosters, leads and capacity across every team in the workspace.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New team
        </Button>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search teams" className="max-w-[220px]" />
          <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} aria-label="Filter by department" className={selectClass}>
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status" className={selectClass}>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="">All statuses</option>
          </select>
        </div>
      </Card>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl bg-ink-100 dark:bg-ink-800" />
          ))}
        </div>
      )}

      {isError && !isLoading && (
        <Card className="py-16 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-red-500" />
          <p className="mt-2 text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load teams</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      )}

      {!isLoading && !isError && teams.length === 0 && (
        <Card className="border-dashed py-16 text-center">
          <Users2 className="mx-auto h-6 w-6 text-ink-300" />
          <p className="mt-2 text-sm font-semibold text-ink-700 dark:text-ink-200">No teams match your filters</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">Create a team to start organising members and capacity.</p>
        </Card>
      )}

      {!isLoading && !isError && teams.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} onClick={() => setSelectedTeamId(team.id)} />
          ))}
        </div>
      )}

      <TeamDrawer teamId={selectedTeamId} onClose={() => setSelectedTeamId(null)} />
      <CreateTeamModal open={createOpen} onClose={() => setCreateOpen(false)} departments={departments.map((d) => ({ id: d.id, name: d.name }))} />
    </div>
  );
}

function TeamCard({ team, onClick }: { team: Team; onClick: () => void }) {
  const tone = utilisationTone(team.utilisation_pct);
  return (
    <button type="button" onClick={onClick} className="text-left">
      <Card className="h-full p-4 transition-shadow hover:shadow-floating">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: team.color || '#4F7CFF' }}
              aria-hidden
            />
            <h3 className="text-sm font-bold text-ink-900 dark:text-white">{team.name}</h3>
          </div>
          {team.status === 'archived' && <Badge tone="neutral">Archived</Badge>}
        </div>
        {team.department_name && <p className="mt-1 text-xs text-ink-400 dark:text-ink-500">{team.department_name}</p>}
        {team.description && <p className="mt-2 line-clamp-2 text-sm text-ink-500 dark:text-ink-400">{team.description}</p>}
        <div className="mt-3 flex items-center justify-between text-xs text-ink-500 dark:text-ink-400">
          <span>Lead: {team.lead_name || 'Unassigned'}</span>
          <span>{team.member_count} member{team.member_count === 1 ? '' : 's'}</span>
        </div>
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-semibold text-ink-500 dark:text-ink-400">Utilisation</span>
            <Badge tone={tone === 'neutral' ? 'neutral' : tone}>
              {team.utilisation_pct !== null ? `${Math.round(team.utilisation_pct)}%` : 'n/a'}
            </Badge>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
            <div
              className={cn(
                'h-full rounded-full',
                tone === 'danger' && 'bg-red-500',
                tone === 'warning' && 'bg-amber-500',
                tone === 'success' && 'bg-emerald-500',
                tone === 'neutral' && 'bg-ink-300'
              )}
              style={{ width: `${Math.min(100, team.utilisation_pct ?? 0)}%` }}
            />
          </div>
          {team.capacity_hours_per_week !== null && (
            <p className="mt-1 text-[11px] text-ink-400 dark:text-ink-500">{team.capacity_hours_per_week} hrs/week capacity</p>
          )}
        </div>
      </Card>
    </button>
  );
}

function TeamDrawer({ teamId, onClose }: { teamId: string | null; onClose: () => void }) {
  const { data: team, isLoading, isError, error } = useTeam(teamId || undefined);
  const archiveTeam = useArchiveTeam();
  const removeMember = useRemoveTeamMember();
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  return (
    <Drawer open={Boolean(teamId)} onClose={onClose} labelledBy="team-drawer-title" width="w-[460px]">
      <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4 dark:border-ink-800">
        <h2 id="team-drawer-title" className="font-display text-base font-bold text-ink-900 dark:text-white">
          {team?.name || 'Team'}
        </h2>
        <button type="button" onClick={onClose} className="rounded-full p-1.5 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800" aria-label="Close" data-autofocus>
          <X className="h-4.5 w-4.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        )}

        {isError && !isLoading && (
          <div className="py-10 text-center">
            <AlertTriangle className="mx-auto h-6 w-6 text-red-500" />
            <p className="mt-2 text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load this team</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
          </div>
        )}

        {team && !isLoading && !isError && (
          <div className="space-y-5">
            <div>
              {team.description && <p className="text-sm text-ink-600 dark:text-ink-300">{team.description}</p>}
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-ink-400 dark:text-ink-500">Department</p>
                  <p className="font-semibold text-ink-800 dark:text-ink-100">{team.department_name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-400 dark:text-ink-500">Lead</p>
                  <p className="font-semibold text-ink-800 dark:text-ink-100">{team.lead_name || 'Unassigned'}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-400 dark:text-ink-500">Capacity</p>
                  <p className="font-semibold text-ink-800 dark:text-ink-100">
                    {team.capacity_hours_per_week !== null ? `${team.capacity_hours_per_week} hrs/week` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-ink-400 dark:text-ink-500">Utilisation</p>
                  <p className="font-semibold text-ink-800 dark:text-ink-100">
                    {team.utilisation_pct !== null ? `${Math.round(team.utilisation_pct)}%` : '—'}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-bold text-ink-900 dark:text-white">Roster ({team.members.length})</h3>
                <Button size="sm" variant="outline" onClick={() => setAddMemberOpen(true)}>
                  <Plus className="h-3.5 w-3.5" /> Add member
                </Button>
              </div>
              {team.members.length === 0 && <p className="text-sm text-ink-400 dark:text-ink-500">No members on this team yet.</p>}
              <ul className="space-y-2">
                {team.members.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 rounded-xl border border-ink-100 p-2.5 dark:border-ink-800">
                    <Avatar src={m.avatar_url} name={m.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink-800 dark:text-ink-100">{m.name}</p>
                      <p className="truncate text-xs text-ink-400 dark:text-ink-500">
                        {m.role} · {m.allocation_pct}% allocation
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (teamId && confirm(`Remove ${m.name} from this team?`)) removeMember.mutate({ teamId, memberId: m.id });
                      }}
                      className="shrink-0 rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                      aria-label={`Remove ${m.name}`}
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {team.status !== 'archived' && (
              <div className="border-t border-ink-100 pt-4 dark:border-ink-800">
                <Button
                  variant="danger"
                  size="sm"
                  loading={archiveTeam.isPending}
                  onClick={() => {
                    if (confirm(`Archive "${team.name}"? Members will remain but the team will move to archived.`)) {
                      archiveTeam.mutate(team.id, { onSuccess: onClose });
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Archive team
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {teamId && <AddMemberModal open={addMemberOpen} onClose={() => setAddMemberOpen(false)} teamId={teamId} />}
    </Drawer>
  );
}

function AddMemberModal({ open, onClose, teamId }: { open: boolean; onClose: () => void; teamId: string }) {
  const addMember = useAddTeamMember();
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('');
  const [allocation, setAllocation] = useState('100');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    addMember.mutate(
      { teamId, user_id: userId, role, allocation_pct: Number(allocation) || 0 },
      {
        onSuccess: () => {
          setUserId('');
          setRole('');
          setAllocation('100');
          onClose();
        },
      }
    );
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-sm" labelledBy="add-member-title">
      <ModalHeader title="Add team member" onClose={onClose} />
      <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink-700 dark:text-ink-200">Member user ID</span>
          <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="Paste the member's user ID" required data-autofocus />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink-700 dark:text-ink-200">Role on team</span>
          <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Contributor" required />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink-700 dark:text-ink-200">Allocation %</span>
          <Input type="number" min={0} max={100} value={allocation} onChange={(e) => setAllocation(e.target.value)} required />
        </label>
        {addMember.isError && <p className="text-sm font-medium text-red-600 dark:text-red-400">{getApiErrorMessage(addMember.error)}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={addMember.isPending}>
            Add member
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function CreateTeamModal({ open, onClose, departments }: { open: boolean; onClose: () => void; departments: Array<{ id: string; name: string }> }) {
  const createTeam = useCreateTeam();
  const [form, setForm] = useState<TeamInput>({ name: '', department_id: '', function: '', description: '', capacity_hours_per_week: undefined });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createTeam.mutate(
      { ...form, department_id: form.department_id || undefined },
      {
        onSuccess: () => {
          setForm({ name: '', department_id: '', function: '', description: '', capacity_hours_per_week: undefined });
          onClose();
        },
      }
    );
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-md" labelledBy="new-team-title">
      <ModalHeader title="New team" onClose={onClose} />
      <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink-700 dark:text-ink-200">Team name</span>
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required data-autofocus />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink-700 dark:text-ink-200">Department</span>
          <select
            value={form.department_id || ''}
            onChange={(e) => setForm((f) => ({ ...f, department_id: e.target.value }))}
            className="h-10 w-full rounded-control border border-ink-200 bg-white px-3 text-sm text-ink-900 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
          >
            <option value="">No department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink-700 dark:text-ink-200">Function</span>
          <Input value={form.function || ''} onChange={(e) => setForm((f) => ({ ...f, function: e.target.value }))} placeholder="e.g. Engineering" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink-700 dark:text-ink-200">Capacity (hrs/week)</span>
          <Input
            type="number"
            min={0}
            value={form.capacity_hours_per_week ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, capacity_hours_per_week: e.target.value ? Number(e.target.value) : undefined }))}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink-700 dark:text-ink-200">Description</span>
          <Input value={form.description || ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </label>
        {createTeam.isError && <p className="text-sm font-medium text-red-600 dark:text-red-400">{getApiErrorMessage(createTeam.error)}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={createTeam.isPending} disabled={!form.name.trim()}>
            Create team
          </Button>
        </div>
      </form>
    </Modal>
  );
}
