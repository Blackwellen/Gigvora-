'use client';

import { useState } from 'react';
import { Search, Star, Check, Building2, User, Plus } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';
import { CreateWorkspaceModal } from '@/components/shell/CreateWorkspaceModal';
import { cn } from '@/lib/cn';

export default function WorkspaceAccountSwitcherPage() {
  const { contexts, activeWorkspaceId, switchWorkspace, starWorkspace, isLoading } = useWorkspace();
  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  if (isLoading || !contexts) {
    return <div className="mx-auto max-w-3xl px-4 py-10"><div className="h-64 animate-pulse rounded-2xl bg-ink-100 dark:bg-ink-800" /></div>;
  }

  const orgs = contexts.organizations.filter((o) => o.name.toLowerCase().includes(query.toLowerCase()));
  const starred = orgs.filter((o) => o.isStarred);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-0">
      <h1 className="text-xl font-bold text-ink-900 dark:text-white">Workspace &amp; Account Switcher</h1>
      <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Switch between your personal account and every organisation you belong to.</p>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 px-3 shadow-surface">
        <Search className="h-4 w-4 text-ink-400 dark:text-ink-500" />
        <input
          id="workspace-page-search"
          name="workspacePageSearch"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search workspaces, teams, people..."
          className="h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-400 dark:placeholder:text-ink-500"
        />
        <button type="button" onClick={() => setCreateOpen(true)} className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">
          <Plus className="h-3.5 w-3.5" /> New workspace
        </button>
      </div>

      <section className="mt-5">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400 dark:text-ink-500">Personal</p>
        <button
          type="button"
          onClick={() => switchWorkspace('personal')}
          className={cn('flex w-full items-center gap-3 rounded-xl border p-3 text-left', activeWorkspaceId === 'personal' ? 'border-brand-300 bg-brand-50/50' : 'border-ink-100 bg-white hover:bg-ink-50 dark:border-ink-800 dark:bg-ink-900 dark:hover:bg-ink-800')}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700">
            <User className="h-5 w-5" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-bold text-ink-900 dark:text-white">{contexts.personal.name}</span>
            <span className="block text-xs text-ink-500 dark:text-ink-400">{contexts.personal.email} · Personal Account</span>
          </span>
          {activeWorkspaceId === 'personal' && <Check className="h-5 w-5 text-brand-600" />}
        </button>
      </section>

      {starred.length > 0 && (
        <section className="mt-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400 dark:text-ink-500">Starred</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {starred.map((org) => (
              <OrgCard key={org.id} org={org} active={activeWorkspaceId === org.id} onSwitch={() => switchWorkspace(org.id)} onStar={() => starWorkspace(org.id, !org.isStarred)} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-5">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400 dark:text-ink-500">Organisations you belong to</p>
        {orgs.length === 0 && <p className="text-sm text-ink-400 dark:text-ink-500">No organisations match your search.</p>}
        <div className="space-y-2">
          {orgs.map((org) => (
            <button
              key={org.id}
              type="button"
              onClick={() => switchWorkspace(org.id)}
              className={cn('flex w-full items-center gap-3 rounded-xl border p-3 text-left', activeWorkspaceId === org.id ? 'border-brand-300 bg-brand-50/50' : 'border-ink-100 bg-white hover:bg-ink-50 dark:border-ink-800 dark:bg-ink-900 dark:hover:bg-ink-800')}
            >
              <Avatar src={org.logoUrl} name={org.name} size="md" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-bold text-ink-900 dark:text-white">{org.name}</span>
                  <Badge tone="neutral" className="capitalize">{org.role}</Badge>
                </span>
                <span className="flex gap-2 text-xs text-ink-500 dark:text-ink-400">
                  {org.unread > 0 && <span className="text-brand-600">{org.unread} unread</span>}
                  {org.pendingActions > 0 && <span className="text-amber-600">{org.pendingActions} pending</span>}
                  {org.unread === 0 && org.pendingActions === 0 && <span>Up to date</span>}
                </span>
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  starWorkspace(org.id, !org.isStarred);
                }}
                className="rounded-lg p-1.5 text-ink-300 hover:text-amber-500"
                aria-label="Star"
              >
                <Star className={cn('h-4 w-4', org.isStarred && 'fill-amber-400 text-amber-400')} />
              </button>
              {activeWorkspaceId === org.id && <Check className="h-5 w-5 shrink-0 text-brand-600" />}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-ink-100 dark:border-ink-800 bg-ink-50/60 p-4 text-xs text-ink-500 dark:text-ink-400">
        <p className="flex items-center gap-1.5 font-semibold text-ink-700 dark:text-ink-200">
          <Building2 className="h-4 w-4" /> Safe account boundaries
        </p>
        <p className="mt-1">Switching ensures you only see data and actions you have access to in that workspace — memberships are verified server-side on every switch.</p>
      </section>

      <CreateWorkspaceModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function OrgCard({
  org,
  active,
  onSwitch,
  onStar,
}: {
  org: { id: string; name: string; logoUrl: string | null; role: string };
  active: boolean;
  onSwitch: () => void;
  onStar: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSwitch}
      className={cn('flex items-center gap-2.5 rounded-xl border p-3 text-left', active ? 'border-brand-300 bg-brand-50/50' : 'border-ink-100 bg-white hover:bg-ink-50 dark:border-ink-800 dark:bg-ink-900 dark:hover:bg-ink-800')}
    >
      <Avatar src={org.logoUrl} name={org.name} size="sm" />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-900 dark:text-white">{org.name}</span>
      <span onClick={(e) => { e.stopPropagation(); onStar(); }} role="button" tabIndex={0} className="text-amber-500">
        <Star className="h-4 w-4 fill-amber-400" />
      </span>
    </button>
  );
}
