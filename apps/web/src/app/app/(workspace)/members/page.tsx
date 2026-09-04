'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Plus, Star, UserPlus, Users } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { Popover, PopoverContent, PopoverTrigger, usePopoverClose } from '@/components/ui/Popover';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import {
  useBusinessMembers,
  useInviteBusinessMember,
  useRemoveBusinessMember,
  useUpdateBusinessMember,
} from '@/hooks/business/useBusinessMembers';
import { getApiErrorMessage } from '@/lib/api';
import type { BusinessMember } from '@/hooks/business/types';

const ROLE_OPTIONS = ['owner', 'admin', 'recruiter', 'hiring_manager', 'finance', 'member', 'viewer'];
const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  active: 'success',
  invited: 'warning',
  suspended: 'danger',
};

const selectClass =
  'h-9 rounded-lg border border-ink-200 bg-white px-2.5 text-xs font-semibold text-ink-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200';

function formatLastActive(iso: string | null) {
  if (!iso) return 'Never';
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function MembersPage() {
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);

  const filter = useMemo(() => ({ role: role || undefined, status: status || undefined, q: q || undefined }), [role, status, q]);
  const { data, isLoading, isError, error } = useBusinessMembers(filter);
  const updateMember = useUpdateBusinessMember();
  const removeMember = useRemoveBusinessMember();

  const members = data?.data || [];
  const total = data?.meta.total ?? 0;

  const columns: DataTableColumn<BusinessMember>[] = [
    {
      key: 'name',
      header: 'Member',
      render: (m) => (
        <div className="flex items-center gap-3">
          <Avatar src={m.avatar_url} name={m.name} size="sm" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-semibold text-ink-800 dark:text-ink-100">{m.name}</p>
              {m.is_starred && <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />}
            </div>
            <p className="truncate text-xs text-ink-400 dark:text-ink-500">{m.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (m) => (
        <Popover>
          <PopoverTrigger>
            <Badge tone="brand" className="cursor-pointer capitalize">
              {m.role.replace(/_/g, ' ')}
            </Badge>
          </PopoverTrigger>
          <PopoverContent align="start" width="w-48">
            <RoleMenu member={m} onChange={(newRole) => updateMember.mutate({ id: m.id, role: newRole })} />
          </PopoverContent>
        </Popover>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (m) => (
        <Badge tone={STATUS_TONE[m.status] || 'neutral'} className="capitalize">
          {m.status}
        </Badge>
      ),
    },
    {
      key: 'teams',
      header: 'Teams / Department',
      render: (m) => (
        <div className="flex flex-wrap items-center gap-1">
          {m.team_names.slice(0, 2).map((t) => (
            <Badge key={t} tone="neutral">
              {t}
            </Badge>
          ))}
          {m.team_names.length > 2 && <Badge tone="neutral">+{m.team_names.length - 2}</Badge>}
          {m.team_names.length === 0 && <span className="text-xs text-ink-400 dark:text-ink-500">{m.department_name || '—'}</span>}
        </div>
      ),
    },
    {
      key: 'last_active',
      header: 'Last active',
      render: (m) => <span className="text-xs text-ink-500 dark:text-ink-400">{formatLastActive(m.last_active_at)}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (m) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Remove ${m.name} from the workspace?`)) removeMember.mutate(m.id);
          }}
          className="text-xs font-semibold text-red-500 hover:text-red-600"
        >
          Remove
        </button>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-5 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
            <Users className="h-5 w-5" /> Members
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Everyone with access to this workspace, and their roles.</p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4" /> Invite member
        </Button>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" className="max-w-[240px]" />
          <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filter by role" className={selectClass}>
            <option value="">All roles</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r} className="capitalize">
                {r.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status" className={selectClass}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="invited">Invited</option>
            <option value="suspended">Suspended</option>
          </select>
          {!isLoading && !isError && <span className="ml-auto text-xs text-ink-400 dark:text-ink-500">{total} member{total === 1 ? '' : 's'}</span>}
        </div>
      </Card>

      {isError && !isLoading ? (
        <Card className="py-16 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-red-500" />
          <p className="mt-2 text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load members</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={members}
          rowKey={(m) => m.id}
          isLoading={isLoading}
          emptyTitle="No members match your filters"
          emptyDescription="Invite someone to your workspace to get started."
          emptyAction={
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Invite member
            </Button>
          }
        />
      )}

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}

function RoleMenu({ member, onChange }: { member: BusinessMember; onChange: (role: string) => void }) {
  const close = usePopoverClose();
  return (
    <div role="none">
      {ROLE_OPTIONS.map((r) => (
        <button
          key={r}
          type="button"
          role="menuitem"
          onClick={() => {
            onChange(r);
            close();
          }}
          className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold capitalize hover:bg-ink-100 dark:hover:bg-ink-800 ${
            r === member.role ? 'text-brand-600 dark:text-brand-400' : 'text-ink-600 dark:text-ink-300'
          }`}
        >
          {r.replace(/_/g, ' ')}
        </button>
      ))}
    </div>
  );
}

function InviteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const invite = useInviteBusinessMember();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    invite.mutate(
      { email, role },
      {
        onSuccess: () => {
          setEmail('');
          setRole('member');
          onClose();
        },
      }
    );
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-sm" labelledBy="invite-title">
      <ModalHeader title="Invite member" onClose={onClose} />
      <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink-700 dark:text-ink-200">Email address</span>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-autofocus placeholder="name@company.com" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink-700 dark:text-ink-200">Role</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="h-10 w-full rounded-control border border-ink-200 bg-white px-3 text-sm capitalize text-ink-900 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
          >
            {ROLE_OPTIONS.filter((r) => r !== 'owner').map((r) => (
              <option key={r} value={r}>
                {r.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </label>
        {invite.isError && <p className="text-sm font-medium text-red-600 dark:text-red-400">{getApiErrorMessage(invite.error)}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={invite.isPending} disabled={!email.trim()}>
            Send invite
          </Button>
        </div>
      </form>
    </Modal>
  );
}
