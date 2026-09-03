'use client';

import Link from 'next/link';
import { Lock, Settings } from 'lucide-react';
import { useMessageRequests } from '@/hooks/useMessageRequests';
import { useHasFeature } from '@/hooks/useEntitlements';

export type MessagingNavKey =
  | 'inbox'
  | 'message-requests'
  | 'group-chats'
  | 'project-messages'
  | 'recruiter-messages'
  | 'sales-messages'
  | 'enterprise-messages';

const NAV_ITEMS: Array<{ key: MessagingNavKey; label: string; href: string; featureKey?: string }> = [
  { key: 'inbox', label: 'Inbox', href: '/app/inbox' },
  { key: 'message-requests', label: 'Message Requests', href: '/app/message-requests' },
  { key: 'group-chats', label: 'Group Chats', href: '/app/group-chats' },
  { key: 'project-messages', label: 'Project Messages', href: '/app/project-messages' },
  { key: 'recruiter-messages', label: 'Recruiter Messages', href: '/app/recruiter-messages', featureKey: 'recruiter_dashboard' },
  { key: 'sales-messages', label: 'Sales Messages', href: '/app/sales-messages', featureKey: 'sales_navigator' },
  { key: 'enterprise-messages', label: 'Enterprise Messages', href: '/app/enterprise-messages', featureKey: 'enterprise_connect' },
];

/**
 * Compact cross-navigation strip shared by every messaging surface (Inbox, Message Requests,
 * Group Chats, Project/Recruiter/Sales/Enterprise Messages). Each of those pages was previously
 * only reachable by typing its exact URL — this row makes them discoverable from one another.
 * Deliberately a single row of plain links, not a mega-menu: this is wiring, not a new nav system.
 */
export function MessagingNavStrip({ current }: { current: MessagingNavKey }) {
  // Shared query key with the Message Requests page's own useMessageRequests() call — React Query
  // dedupes identical keys, so this doesn't add a duplicate network request on that page, and on
  // the other six pages it's a single small, gracefully-degrading request that powers a real count.
  const { data: requestsData } = useMessageRequests();
  const pendingCount = requestsData?.data.filter((r) => r.status === 'pending').length ?? 0;

  const hasSalesNavigator = useHasFeature('sales_navigator');
  const hasEnterpriseConnect = useHasFeature('enterprise_connect');
  const hasRecruiterDashboard = useHasFeature('recruiter_dashboard');

  const entitlementByFeature: Record<string, boolean | undefined> = {
    sales_navigator: hasSalesNavigator,
    enterprise_connect: hasEnterpriseConnect,
    recruiter_dashboard: hasRecruiterDashboard,
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5 border-b border-ink-100 pb-3 dark:border-ink-800">
      {NAV_ITEMS.map((item) => {
        const active = item.key === current;
        const locked = item.featureKey ? entitlementByFeature[item.featureKey] === false : false;
        return (
          <Link
            key={item.key}
            href={item.href}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
              active ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800'
            }`}
          >
            {item.label}
            {item.key === 'message-requests' && pendingCount > 0 && (
              <span
                className={`flex h-4.5 min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                  active ? 'bg-white/25 text-white' : 'bg-brand-600 text-white'
                }`}
              >
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            )}
            {locked && <Lock className={`h-3 w-3 ${active ? 'text-white/80' : 'text-ink-400 dark:text-ink-500'}`} />}
          </Link>
        );
      })}
      <Link
        href="/app/settings/messaging-settings"
        aria-label="Messaging settings"
        title="Messaging settings"
        className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:text-ink-500 dark:hover:bg-ink-800 dark:hover:text-ink-100"
      >
        <Settings className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
