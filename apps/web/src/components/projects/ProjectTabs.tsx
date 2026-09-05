'use client';

import Link from 'next/link';
import { cn } from '@/lib/cn';
import type { PmMemberRole } from '@/hooks/projects/types';

export type ProjectTabKey =
  | 'overview'
  | 'tasks'
  | 'board'
  | 'timeline'
  | 'calendar'
  | 'milestones'
  | 'deliverables'
  | 'files'
  | 'discussions'
  | 'chat'
  | 'time'
  | 'timesheets'
  | 'budget'
  | 'payments'
  | 'approvals'
  | 'changeRequests'
  | 'bids'
  | 'members'
  | 'resources'
  | 'risks'
  | 'dependencies'
  | 'analytics'
  | 'settings'
  | 'completion';

const TAB_CONFIG: Array<{ key: ProjectTabKey; label: string; href: (projectId: string) => string; enabled: boolean }> = [
  { key: 'overview', label: 'Overview', href: (id) => `/app/project-overview?projectId=${id}`, enabled: true },
  { key: 'tasks', label: 'Tasks', href: (id) => `/app/project-tasks?projectId=${id}`, enabled: true },
  { key: 'board', label: 'Board', href: (id) => `/app/board?projectId=${id}`, enabled: true },
  { key: 'timeline', label: 'Timeline', href: (id) => `/app/timeline--gantt?projectId=${id}`, enabled: true },
  { key: 'calendar', label: 'Calendar', href: (id) => `/app/calendar?projectId=${id}`, enabled: true },
  { key: 'milestones', label: 'Milestones', href: (id) => `/app/milestones?projectId=${id}`, enabled: true },
  { key: 'deliverables', label: 'Deliverables', href: (id) => `/app/deliverables?projectId=${id}`, enabled: true },
  { key: 'files', label: 'Files', href: (id) => `/app/files?projectId=${id}`, enabled: true },
  { key: 'discussions', label: 'Discussions', href: (id) => `/app/discussions?projectId=${id}`, enabled: true },
  { key: 'chat', label: 'Chat', href: (id) => `/app/project-chat?projectId=${id}`, enabled: true },
  { key: 'time', label: 'Time', href: (id) => `/app/time-tracking?projectId=${id}`, enabled: true },
  { key: 'timesheets', label: 'Timesheets', href: (id) => `/app/timesheets?projectId=${id}`, enabled: true },
  { key: 'budget', label: 'Budget', href: (id) => `/app/budget?projectId=${id}`, enabled: true },
  { key: 'payments', label: 'Payments', href: (id) => `/app/project-payments?projectId=${id}`, enabled: true },
  { key: 'approvals', label: 'Approvals', href: (id) => `/app/approvals?projectId=${id}`, enabled: true },
  { key: 'changeRequests', label: 'Change Requests', href: (id) => `/app/change-requests?projectId=${id}`, enabled: true },
  { key: 'bids', label: 'Bids', href: (id) => `/app/project-bids?projectId=${id}`, enabled: true },
  { key: 'members', label: 'Members', href: (id) => `/app/project-members?projectId=${id}`, enabled: true },
  { key: 'resources', label: 'Resources', href: (id) => `/app/resource-planning?projectId=${id}`, enabled: true },
  { key: 'risks', label: 'Risks', href: (id) => `/app/project-risks-and-issues?projectId=${id}`, enabled: true },
  { key: 'dependencies', label: 'Dependencies', href: (id) => `/app/project-dependencies?projectId=${id}`, enabled: true },
  { key: 'analytics', label: 'Analytics', href: (id) => `/app/project-analytics?projectId=${id}`, enabled: true },
  { key: 'settings', label: 'Settings', href: (id) => `/app/settings/project-settings?projectId=${id}`, enabled: true },
  { key: 'completion', label: 'Completion', href: (id) => `/app/project-completion?projectId=${id}`, enabled: true },
];

// Tabs surfacing project-wide financial/reporting decisions (budget lines,
// change-request sign-off, cross-task analytics, handover) — a working
// professional/reviewer/guest doesn't manage these, only owner/manager/
// client/finance do. Everything not listed here (tasks, board, files, chat,
// their own payment milestones, bids, risks, dependencies, etc.) stays
// visible to every accepted member regardless of role.
const MANAGEMENT_TABS = new Set<ProjectTabKey>(['budget', 'approvals', 'changeRequests', 'analytics', 'completion']);
// Internal team-ops tabs — capacity planning and project configuration are
// owner/manager-only, not even shown to the paying client.
const ADMIN_TABS = new Set<ProjectTabKey>(['resources', 'settings']);

function isTabVisible(tab: ProjectTabKey, role: PmMemberRole | undefined) {
  if (ADMIN_TABS.has(tab)) return role === 'owner' || role === 'manager';
  if (MANAGEMENT_TABS.has(tab)) return role === 'owner' || role === 'manager' || role === 'client' || role === 'finance';
  return true;
}

/**
 * Route-based project sub-navigation (each tab is a distinct page, unlike
 * ui/Tabs.tsx which switches client-side panels within one page). Every tab
 * is enabled as of Phase B — a tab renders disabled only if a future phase
 * adds a new one ahead of its page shipping, never as a permanent state.
 * Visibility (as opposed to enabled/disabled) is role-based: this mirrors
 * apps/api/.../pm-projects/permissions.js's owner/manager-only checks so a
 * professional/reviewer/guest member never sees a tab that would just 403 —
 * this is a UI affordance only, the server permission check is still the
 * real boundary.
 */
export function ProjectTabs({
  projectId,
  active,
  counts = {},
  myRole,
}: {
  projectId: string;
  active: ProjectTabKey;
  counts?: Partial<Record<ProjectTabKey, number>>;
  myRole?: PmMemberRole;
}) {
  const visibleTabs = TAB_CONFIG.filter((tab) => isTabVisible(tab.key, myRole));
  return (
    <div role="tablist" aria-label="Project sections" className="flex items-center gap-1 overflow-x-auto border-b border-ink-100 dark:border-ink-800">
      {visibleTabs.map((tab) => {
        const isActive = tab.key === active;
        const count = counts[tab.key];
        const content = (
          <>
            {tab.label}
            {typeof count === 'number' && <span className="ml-1 text-xs font-bold text-ink-400 dark:text-ink-500">{count}</span>}
            {!tab.enabled && <span className="ml-1.5 rounded-full bg-ink-100 px-1.5 py-0.5 text-[10px] font-semibold text-ink-400 dark:bg-ink-800 dark:text-ink-500">Later phase</span>}
          </>
        );

        const className = cn(
          'relative flex shrink-0 items-center gap-1 whitespace-nowrap px-3.5 py-2.5 font-display text-sm font-semibold tracking-[-0.01em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
          isActive ? 'text-brand-700 dark:text-brand-400' : tab.enabled ? 'text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-100' : 'cursor-not-allowed text-ink-300 dark:text-ink-700'
        );

        return tab.enabled ? (
          <Link key={tab.key} href={tab.href(projectId)} role="tab" aria-selected={isActive} className={className}>
            {content}
            {isActive && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-600" />}
          </Link>
        ) : (
          <span key={tab.key} role="tab" aria-selected={false} aria-disabled="true" className={className}>
            {content}
          </span>
        );
      })}
    </div>
  );
}
