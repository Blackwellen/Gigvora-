'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Users, Bell, MessageSquare, Menu } from 'lucide-react';
import { useState } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { useNavigationTree } from '@/hooks/useNavigation';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { NavIcon } from '@/components/ui/icon';
import { CountBadge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';

const TABS = [
  { key: 'live-feed', route: '/app/live-feed', label: 'Feed', icon: Activity },
  { key: 'network', route: '/app/network', label: 'Network', icon: Users },
  { key: 'notifications', route: '/app/notifications-tray', label: 'Alerts', icon: Bell },
  { key: 'messages', route: '/app/chat-bubble', label: 'Inbox', icon: MessageSquare },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const { unreadMessages, unreadNotifications } = useUnreadCounts();
  const { data: tree } = useNavigationTree();

  const badgeFor: Record<string, number> = { notifications: unreadNotifications, messages: unreadMessages };

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-ink-100 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)] dark:border-ink-800 dark:bg-ink-900/95 xl:hidden"
        aria-label="Primary (mobile)"
      >
        {TABS.map((tab) => {
          const active = pathname?.startsWith(tab.route);
          const count = badgeFor[tab.key];
          return (
            <Link
              key={tab.key}
              href={tab.route}
              className={cn(
                'relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold',
                active ? 'text-brand-600 dark:text-brand-400' : 'text-ink-400 dark:text-ink-500'
              )}
            >
              <span className="relative">
                <tab.icon className="h-5 w-5" />
                {count > 0 && <CountBadge count={count} className="absolute -right-1.5 -top-1.5" />}
              </span>
              {tab.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold text-ink-400 dark:text-ink-500"
        >
          <Menu className="h-5 w-5" />
          More
        </button>
      </nav>

      <Drawer open={moreOpen} onClose={() => setMoreOpen(false)} side="right" width="w-[300px]">
        <div className="flex items-center justify-between border-b border-ink-100 p-4 dark:border-ink-800">
          <p className="text-sm font-bold text-ink-900 dark:text-white">More</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {tree?.map((item) => {
            // Every top-level item carries its own `route` (e.g. Work ->
            // /app/gigs), so a top-level-vs-no-route split can never reach a
            // mega menu's nested links (Projects Home, Browse Projects, any
            // Recruiter sub-page, etc.) — they'd be silently unreachable from
            // this drawer. Instead: a top-level item with sub-links renders
            // as a group of those links; one with none renders as a single
            // direct link.
            const links = item.children.flatMap((section) => section.children);
            if (links.length === 0) {
              if (!item.route) return null;
              return (
                <Link
                  key={item.key}
                  href={item.route}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-ink-800 hover:bg-ink-50 dark:text-ink-100 dark:hover:bg-ink-800"
                >
                  <NavIcon name={item.iconKey} className="h-4.5 w-4.5 text-ink-400 dark:text-ink-500" />
                  {item.label}
                </Link>
              );
            }
            return (
              <div key={item.key} className="mb-3">
                <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-ink-400 dark:text-ink-500">{item.label}</p>
                {links.map((link) => (
                  <Link
                    key={link.key}
                    href={link.route || '#'}
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-ink-800 hover:bg-ink-50 dark:text-ink-100 dark:hover:bg-ink-800"
                  >
                    <NavIcon name={link.iconKey} className="h-4.5 w-4.5 text-ink-400 dark:text-ink-500" />
                    {link.label}
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      </Drawer>
    </>
  );
}
