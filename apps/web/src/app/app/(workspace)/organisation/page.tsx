'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Building2, ChevronRight, Plus, Shield, Trash2 } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CountrySelect } from '@/components/ui/CountrySelect';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import {
  useBusinessRoles,
  useBusinessWorkspace,
  useCreateBusinessRole,
  useDeleteBusinessRole,
  useUpdateBusinessRole,
  useUpdateBusinessWorkspace,
  type BusinessRoleInput,
} from '@/hooks/business/useBusinessWorkspace';
import { useDepartments } from '@/hooks/business/useDepartments';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';
import { getApiErrorMessage } from '@/lib/api';
import type { BusinessRole, Department } from '@/hooks/business/types';

const TABS = [
  { key: 'profile', label: 'Profile' },
  { key: 'roles', label: 'Roles & Permissions' },
  { key: 'hierarchy', label: 'Hierarchy' },
];

const PERMISSION_OPTIONS = [
  'manage_workspace',
  'manage_members',
  'manage_roles',
  'manage_teams',
  'manage_departments',
  'manage_hiring',
  'manage_spend',
  'approve_budgets',
  'view_analytics',
  'view_spend',
];

export default function OrganisationPage() {
  const [tab, setTab] = useState('profile');

  return (
    <div className="mx-auto max-w-[1100px] space-y-4 px-4 py-5 lg:px-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
          <Building2 className="h-5 w-5" /> Organisation
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Manage your organisation&rsquo;s profile, roles and department hierarchy.</p>
      </div>

      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === 'profile' && <ProfileTab />}
      {tab === 'roles' && <RolesTab />}
      {tab === 'hierarchy' && <HierarchyTab />}
    </div>
  );
}

function ProfileTab() {
  const { data: workspace, isLoading, isError, error } = useBusinessWorkspace();
  const { active } = useWorkspace();
  const updateWorkspace = useUpdateBusinessWorkspace();

  const canEdit = active?.type === 'organization' && (active.role === 'owner' || active.role === 'admin');

  const [form, setForm] = useState({ name: '', description: '', website: '', industry: '', size: '', logo_url: '', location: '', country_code: '' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (workspace) {
      setForm({
        name: workspace.name || '',
        description: workspace.description || '',
        website: workspace.website || '',
        industry: workspace.industry || '',
        size: workspace.size || '',
        logo_url: workspace.logo_url || '',
        location: workspace.location || '',
        country_code: workspace.country_code || '',
      });
    }
  }, [workspace]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    updateWorkspace.mutate(
      {
        name: form.name,
        description: form.description || undefined,
        website: form.website || undefined,
        industry: form.industry || undefined,
        size: form.size || undefined,
        logo_url: form.logo_url || undefined,
        location: form.location || undefined,
        country_code: form.country_code || undefined,
      },
      { onSuccess: () => setSaved(true) }
    );
  }

  if (isLoading) {
    return <div className="h-72 animate-pulse rounded-2xl bg-ink-100 dark:bg-ink-800" />;
  }

  if (isError) {
    return (
      <Card className="py-16 text-center">
        <AlertTriangle className="mx-auto h-6 w-6 text-red-500" />
        <p className="mt-2 text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load organisation profile</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Organisation profile" />
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
        {!canEdit && (
          <div className="sm:col-span-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
            Only workspace owners and admins can edit the organisation profile.
          </div>
        )}
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink-700 dark:text-ink-200">Organisation name</span>
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} disabled={!canEdit} required />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink-700 dark:text-ink-200">Industry</span>
          <Input value={form.industry} onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))} disabled={!canEdit} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink-700 dark:text-ink-200">Company size</span>
          <Input value={form.size} onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))} disabled={!canEdit} placeholder="e.g. 51-200" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink-700 dark:text-ink-200">Website</span>
          <Input value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} disabled={!canEdit} placeholder="https://" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink-700 dark:text-ink-200">Location</span>
          <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} disabled={!canEdit} placeholder="e.g. San Francisco, CA" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink-700 dark:text-ink-200">Country</span>
          <CountrySelect value={form.country_code || null} onChange={(v) => setForm((f) => ({ ...f, country_code: v || '' }))} className={!canEdit ? 'pointer-events-none opacity-60' : undefined} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink-700 dark:text-ink-200">Logo URL</span>
          <Input value={form.logo_url} onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))} disabled={!canEdit} />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-semibold text-ink-700 dark:text-ink-200">Description</span>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            disabled={!canEdit}
            rows={4}
            className="w-full rounded-control border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-ink-50 dark:border-ink-700 dark:bg-ink-900 dark:text-white dark:disabled:bg-ink-800/60"
          />
        </label>
        {updateWorkspace.isError && (
          <p className="sm:col-span-2 text-sm font-medium text-red-600 dark:text-red-400">{getApiErrorMessage(updateWorkspace.error)}</p>
        )}
        {saved && !updateWorkspace.isPending && <p className="sm:col-span-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">Profile saved.</p>}
        {canEdit && (
          <div className="sm:col-span-2">
            <Button type="submit" loading={updateWorkspace.isPending}>
              Save changes
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}

function RolesTab() {
  const { data: roles, isLoading, isError, error } = useBusinessRoles();
  const createRole = useCreateBusinessRole();
  const updateRole = useUpdateBusinessRole();
  const deleteRole = useDeleteBusinessRole();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BusinessRole | null>(null);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(role: BusinessRole) {
    setEditing(role);
    setModalOpen(true);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500 dark:text-ink-400">Custom roles control what members can see and do inside the workspace.</p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" /> New role
        </Button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-ink-100 dark:bg-ink-800" />
          ))}
        </div>
      )}

      {isError && !isLoading && (
        <Card className="py-16 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-red-500" />
          <p className="mt-2 text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load roles</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      )}

      {!isLoading && !isError && roles && roles.length === 0 && (
        <Card className="border-dashed py-16 text-center">
          <Shield className="mx-auto h-6 w-6 text-ink-300" />
          <p className="mt-2 text-sm font-semibold text-ink-700 dark:text-ink-200">No custom roles yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">Create a role to grant scoped permissions to members.</p>
        </Card>
      )}

      {!isLoading && !isError && roles && roles.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {roles.map((role) => (
            <Card key={role.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-ink-900 dark:text-white">{role.name}</h3>
                    {role.is_system && <Badge tone="neutral">System</Badge>}
                  </div>
                  {role.description && <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">{role.description}</p>}
                </div>
                {!role.is_system && (
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(role)}
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete the "${role.name}" role?`)) deleteRole.mutate(role.id);
                      }}
                      className="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                      aria-label={`Delete ${role.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {role.permissions.map((perm) => (
                  <Badge key={perm} tone="brand" className="capitalize">
                    {perm.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
              <p className="mt-3 text-xs text-ink-400 dark:text-ink-500">{role.member_count} member{role.member_count === 1 ? '' : 's'}</p>
            </Card>
          ))}
        </div>
      )}

      <RoleModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        onCreate={(body) => createRole.mutate(body, { onSuccess: () => setModalOpen(false) })}
        onUpdate={(id, body) => updateRole.mutate({ id, ...body }, { onSuccess: () => setModalOpen(false) })}
        pending={createRole.isPending || updateRole.isPending}
        errorMessage={createRole.isError ? getApiErrorMessage(createRole.error) : updateRole.isError ? getApiErrorMessage(updateRole.error) : undefined}
      />
    </div>
  );
}

function RoleModal({
  open,
  onClose,
  editing,
  onCreate,
  onUpdate,
  pending,
  errorMessage,
}: {
  open: boolean;
  onClose: () => void;
  editing: BusinessRole | null;
  onCreate: (body: BusinessRoleInput) => void;
  onUpdate: (id: string, body: BusinessRoleInput) => void;
  pending: boolean;
  errorMessage?: string;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setName(editing?.name || '');
      setDescription(editing?.description || '');
      setPermissions(editing?.permissions || []);
    }
  }, [open, editing]);

  function togglePermission(perm: string) {
    setPermissions((prev) => (prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body: BusinessRoleInput = { name, description: description || undefined, permissions };
    if (editing) onUpdate(editing.id, body);
    else onCreate(body);
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-lg" labelledBy="role-modal-title">
      <ModalHeader title={editing ? 'Edit role' : 'New role'} onClose={onClose} />
      <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink-700 dark:text-ink-200">Role name</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} required data-autofocus />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink-700 dark:text-ink-200">Description</span>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What can this role do?" />
        </label>
        <div>
          <span className="mb-1.5 block text-sm font-semibold text-ink-700 dark:text-ink-200">Permissions</span>
          <div className="flex flex-wrap gap-1.5">
            {PERMISSION_OPTIONS.map((perm) => {
              const active = permissions.includes(perm);
              return (
                <button
                  key={perm}
                  type="button"
                  onClick={() => togglePermission(perm)}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize transition-colors ${
                    active
                      ? 'bg-brand-600 text-white'
                      : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700'
                  }`}
                >
                  {perm.replace(/_/g, ' ')}
                </button>
              );
            })}
          </div>
        </div>
        {errorMessage && <p className="text-sm font-medium text-red-600 dark:text-red-400">{errorMessage}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={pending} disabled={!name.trim() || permissions.length === 0}>
            {editing ? 'Save role' : 'Create role'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function HierarchyTab() {
  const { data, isLoading, isError, error } = useDepartments({ status: 'active' });
  const departments = data?.data || [];

  const roots = departments.filter((d) => !d.parent_department_id);
  const childrenOf = (id: string) => departments.filter((d) => d.parent_department_id === id);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-ink-100 dark:bg-ink-800" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="py-16 text-center">
        <AlertTriangle className="mx-auto h-6 w-6 text-red-500" />
        <p className="mt-2 text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load the department hierarchy</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
      </Card>
    );
  }

  if (departments.length === 0) {
    return (
      <Card className="border-dashed py-16 text-center">
        <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No departments yet</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">
          Set up departments from the <Link href="/app/departments" className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">Departments</Link> page to see them here.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Department hierarchy" />
      <div className="space-y-1 px-3 py-4">
        {roots.map((dept) => (
          <DeptNode key={dept.id} dept={dept} depth={0} childrenOf={childrenOf} />
        ))}
      </div>
    </Card>
  );
}

function DeptNode({ dept, depth, childrenOf }: { dept: Department; depth: number; childrenOf: (id: string) => Department[] }) {
  const children = childrenOf(dept.id);
  return (
    <div>
      <Link
        href={`/app/departments?departmentId=${dept.id}`}
        className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-ink-50 dark:hover:bg-ink-800/60"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-300" />
        <span className="font-semibold text-ink-800 dark:text-ink-100">{dept.name}</span>
        {dept.cost_center_code && <Badge tone="neutral">{dept.cost_center_code}</Badge>}
        <span className="ml-auto shrink-0 text-xs text-ink-400 dark:text-ink-500">
          {dept.member_count} member{dept.member_count === 1 ? '' : 's'} · {dept.team_count} team{dept.team_count === 1 ? '' : 's'}
        </span>
      </Link>
      {children.map((child) => (
        <DeptNode key={child.id} dept={child} depth={depth + 1} childrenOf={childrenOf} />
      ))}
    </div>
  );
}
