'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Plus, Search, Users, Video, CheckSquare, CalendarDays, LayoutGrid, MoreHorizontal } from 'lucide-react';
import { PrimaryNav } from './PrimaryNav';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { UserMenu } from './UserMenu';
import { useQuickCreate } from '@/components/overlays/QuickCreateContext';
import { Popover, PopoverTrigger, PopoverContent, usePopoverClose } from '@/components/ui/Popover';
import { TopBarSearch } from './widgets/TopBarSearch';
import { NotificationsWidget } from './widgets/NotificationsWidget';
import { NetworkRequestsWidget } from './widgets/NetworkRequestsWidget';
import { VideoPlayerWidget } from './widgets/VideoPlayerWidget';
import { TaskListWidget } from './widgets/TaskListWidget';
import { CalendarWidget } from './widgets/CalendarWidget';
import { SalesNavigatorWidget } from './widgets/SalesNavigatorWidget';
import { AdsWidget } from './widgets/AdsWidget';
import { EnterpriseConnectWidget } from './widgets/EnterpriseConnectWidget';
import { CreationStudioWidget } from './widgets/CreationStudioWidget';

export function GlobalTopBar() {
  const { open: openQuickCreate } = useQuickCreate();

  return (
    <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/95 backdrop-blur dark:border-ink-800 dark:bg-ink-900/95">
      {/* Row 1: brand + workspace on the left, a wide centred search bar, and the
          widget cluster grouped right next to Create on the right. */}
      <div className="flex h-16 items-center gap-4 px-4 lg:px-6">
        <Link href="/app/live-feed" className="flex shrink-0 items-center" aria-label="Gigvora — Live Feed">
          <Image src="/logo.png" alt="Gigvora" width={128} height={43} priority className="h-7 w-auto" />
        </Link>

        <WorkspaceSwitcher />

        {/* Search sits left-of-centre in the remaining space and is 1.5x the width
            of the old trailing search field. */}
        <div className="hidden min-w-0 flex-1 justify-center lg:flex">
          <div className="w-full max-w-3xl">
            <TopBarSearch />
          </div>
        </div>

        <button
          type="button"
          onClick={() => (window.location.href = '/app/search')}
          aria-label="Search"
          data-tour-anchor="search"
          className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800 lg:hidden"
        >
          <Search className="h-4.5 w-4.5" />
        </button>

        {/* Widget cluster + Create + avatar, grouped together on the trailing edge. */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <div className="hidden items-center gap-0.5 rounded-xl border border-ink-100 bg-ink-50/60 p-1 md:flex dark:border-ink-800 dark:bg-ink-800/40">
            <NotificationsWidget />
            <NetworkRequestsWidget />
            <VideoPlayerWidget />
            <TaskListWidget />
            <CalendarWidget />
            {/* Entitlement-gated: each renders nothing unless the account
                has the corresponding feature (see useHasFeature in
                apps/web/src/hooks/useEntitlements.ts). */}
            <SalesNavigatorWidget />
            {/* Gigvora Ads is available to every account — no entitlement gate. */}
            <AdsWidget />
            <EnterpriseConnectWidget />
            <CreationStudioWidget />
          </div>

          {/* Mobile / tablet: collapse the widget cluster into a single overflow menu
              so the bar never overflows on small screens. */}
          <MoreWidgetsMenu />

          <button
            type="button"
            data-tour-anchor="create"
            onClick={openQuickCreate}
            className="flex h-10 items-center gap-1.5 rounded-xl bg-gradient-to-b from-brand-500 to-brand-600 px-4 text-sm font-semibold text-white shadow-button-primary transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-button-primary-hover active:translate-y-0 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Create</span>
          </button>

          <span data-tour-anchor="avatar">
            <UserMenu />
          </span>
        </div>
      </div>

      {/* Row 2: the mega-menu primary nav, centred. */}
      <div className="hidden border-t border-ink-100 xl:flex xl:h-12 xl:items-center xl:justify-center dark:border-ink-800">
        <PrimaryNav />
      </div>
    </header>
  );
}

const OVERFLOW_LINKS = [
  { key: 'network', label: 'Network requests', href: '/app/network?tab=invitations', icon: Users },
  { key: 'videos', label: 'Videos', href: '/video-explore', icon: Video },
  { key: 'tasks', label: 'Tasks', href: '/app/tasks', icon: CheckSquare },
  { key: 'calendar', label: 'Calendar', href: '/app/calendar', icon: CalendarDays },
  { key: 'creation-studio', label: 'Creation studio', href: '/app/quick-create', icon: LayoutGrid },
];

function MoreWidgetsMenu() {
  return (
    <Popover>
      <PopoverTrigger>
        <button
          type="button"
          aria-label="More"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800 md:hidden"
        >
          <MoreHorizontal className="h-4.5 w-4.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent width="w-64" className="p-1.5">
        {OVERFLOW_LINKS.map(({ key, ...link }) => (
          <OverflowLink key={key} {...link} />
        ))}
      </PopoverContent>
    </Popover>
  );
}

function OverflowLink({ label, href, icon: Icon }: { label: string; href: string; icon: typeof Users }) {
  const close = usePopoverClose();
  return (
    <Link
      href={href}
      onClick={close}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-ink-800"
    >
      <Icon className="h-4 w-4 text-ink-400 dark:text-ink-500" /> {label}
    </Link>
  );
}
