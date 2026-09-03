'use client';

import { useState } from 'react';
import { ChevronDown, Search, Star, Plus, Check, Building2, User, FileText } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent, usePopoverClose } from '@/components/ui/Popover';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';
import { cn } from '@/lib/cn';
import { CreateWorkspaceModal } from './CreateWorkspaceModal';

export function WorkspaceSwitcher() {
  const { contexts, active, activeWorkspaceId, switchWorkspace, starWorkspace } = useWorkspace();
  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  if (!contexts || !active) {
    return <div className="h-9 w-40 animate-pulse rounded-lg bg-ink-100 dark:bg-ink-800" />;
  }

  const filteredOrgs = contexts.organizations.filter((o) => o.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <Popover>
      <PopoverTrigger>
        <button
          type="button"
          className="flex h-9 max-w-[200px] items-center gap-2 rounded-lg border border-ink-200 dark:border-ink-700 px-2.5 text-sm font-semibold text-ink-800 dark:text-ink-100 hover:bg-ink-50 dark:hover:bg-ink-800"
        >
          {active.type === 'organization' ? (
            <Avatar src={active.logoUrl} name={active.name} size="xs" />
          ) : (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-700">
              <User className="h-3.5 w-3.5" />
            </span>
          )}
          <span className="truncate">{active.type === 'organization' ? active.name : 'Personal Account'}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-400 dark:text-ink-500" />
        </button>
      </PopoverTrigger>
      <PopoverContent width="w-96" align="start">
        <SwitcherBody
          query={query}
          setQuery={setQuery}
          personal={contexts.personal}
          organizations={filteredOrgs}
          activeWorkspaceId={activeWorkspaceId}
          onSwitch={switchWorkspace}
          onStar={starWorkspace}
          onCreate={() => setCreateOpen(true)}
        />
      </PopoverContent>
      <CreateWorkspaceModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </Popover>
  );
}

function SwitcherBody({
  query,
  setQuery,
  personal,
  organizations,
  activeWorkspaceId,
  onSwitch,
  onStar,
  onCreate,
}: {
  query: string;
  setQuery: (v: string) => void;
  personal: { name: string; email: string; hasProfessionalProfile: boolean };
  organizations: Array<{
    id: string;
    name: string;
    logoUrl: string | null;
    role: string;
    isStarred: boolean;
    unread: number;
    pendingActions: number;
  }>;
  activeWorkspaceId: string;
  onSwitch: (id: string) => Promise<void>;
  onStar: (id: string, starred: boolean) => Promise<void>;
  onCreate: () => void;
}) {
  const close = usePopoverClose();

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-ink-100 dark:border-ink-800 px-2 pb-2">
        <Search className="h-4 w-4 text-ink-400 dark:text-ink-500" />
        <input
          id="workspace-switcher-search"
          name="workspaceSearch"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search workspaces..."
          className="h-9 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-400 dark:placeholder:text-ink-500"
        />
      </div>

      <div className="max-h-96 overflow-y-auto py-1">
        <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-ink-400 dark:text-ink-500">Personal</p>
        <button
          type="button"
          onClick={async () => {
            await onSwitch('personal');
            close();
          }}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-ink-50 dark:hover:bg-ink-800"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700">
            <User className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-ink-900 dark:text-white">{personal.name}</span>
            <span className="block truncate text-xs text-ink-500 dark:text-ink-400">{personal.email}</span>
          </span>
          {activeWorkspaceId === 'personal' && <Check className="h-4 w-4 text-brand-600" />}
        </button>

        {organizations.length > 0 && (
          <p className="px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wide text-ink-400 dark:text-ink-500">Organisations</p>
        )}
        {organizations.map((org) => (
          <div key={org.id} className="group flex items-center gap-1 rounded-lg px-1 hover:bg-ink-50 dark:hover:bg-ink-800">
            <button
              type="button"
              onClick={async () => {
                await onSwitch(org.id);
                close();
              }}
              className="flex flex-1 items-center gap-2.5 rounded-lg px-2 py-2 text-left"
            >
              <Avatar src={org.logoUrl} name={org.name} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink-900 dark:text-white">{org.name}</span>
                <span className="flex items-center gap-1.5 text-xs text-ink-500 dark:text-ink-400">
                  <Badge tone="neutral" className="capitalize">
                    {org.role}
                  </Badge>
                  {org.unread > 0 && <span className="text-brand-600">{org.unread} unread</span>}
                  {org.pendingActions > 0 && <span className="text-amber-600">{org.pendingActions} pending</span>}
                </span>
              </span>
              {activeWorkspaceId === org.id && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
            </button>
            <button
              type="button"
              aria-label={org.isStarred ? 'Unstar workspace' : 'Star workspace'}
              onClick={() => onStar(org.id, !org.isStarred)}
              className="shrink-0 p-1.5 text-ink-300 opacity-0 hover:text-amber-500 group-hover:opacity-100"
            >
              <Star className={cn('h-4 w-4', org.isStarred && 'fill-amber-400 text-amber-400 opacity-100')} />
            </button>
          </div>
        ))}

        {organizations.length === 0 && query && (
          <p className="px-3 py-4 text-center text-sm text-ink-400 dark:text-ink-500">No workspaces match &ldquo;{query}&rdquo;</p>
        )}
      </div>

      <div className="border-t border-ink-100 dark:border-ink-800 pt-1">
        <a
          href="/app/workspace--account-switcher"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50"
        >
          <Plus className="h-4 w-4" /> Manage workspaces
        </a>
        <button
          type="button"
          onClick={() => {
            close();
            onCreate();
          }}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-ink-600 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-800"
        >
          <Building2 className="h-4 w-4" /> Create workspace
        </button>
        {/* Pages (company/topic pages you follow or administer) are a
            separate, not-yet-built domain — /app/pages/new is a real, wired
            route whose content UI is still pending, same convention as the
            rest of the app shell. */}
        <a
          href="/app/pages/new"
          onClick={close}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-ink-600 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-800"
        >
          <FileText className="h-4 w-4" /> Create a business page
        </a>
      </div>
    </div>
  );
}
