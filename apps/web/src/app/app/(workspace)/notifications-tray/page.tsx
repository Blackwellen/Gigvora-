'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNowStrict } from 'date-fns';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { Tabs } from '@/components/ui/Tabs';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  getNotificationIcon,
  getNotificationLabel,
  getNotificationDeepLink,
  NOTIFICATION_TYPE_META,
  type NotificationData,
} from '@/hooks/useNotifications';

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'mentions', label: 'Mentions' },
  { key: 'system', label: 'System' },
] as const;

export default function NotificationsTrayPage() {
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]['key']>('all');

  const filtered = (notifications || []).filter((n) => {
    if (category === 'unread') return !n.is_read;
    if (category === 'mentions') return n.type === 'comment.reply';
    if (category === 'system') return !NOTIFICATION_TYPE_META[n.type];
    return true;
  });

  const unreadIds = (notifications || []).filter((n) => !n.is_read).map((n) => n.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:px-0">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
          <Bell className="h-5 w-5" /> Notifications
        </h1>
        <button
          type="button"
          disabled={!unreadIds.length || markAllRead.isPending}
          onClick={() => markAllRead.mutate(unreadIds)}
          className="flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-40"
        >
          <CheckCheck className="h-4 w-4" /> Mark all read
        </button>
      </div>

      <div className="rounded-2xl border border-ink-100 dark:border-ink-800 bg-white dark:bg-ink-900 shadow-surface">
        <Tabs tabs={CATEGORIES.map((c) => ({ ...c, count: c.key === 'unread' ? unreadIds.length : undefined }))} value={category} onChange={(k) => setCategory(k as typeof category)} className="px-2" />

        {isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-ink-300" />
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="py-14 text-center">
            <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">You&rsquo;re all caught up</p>
            <p className="mt-1 text-sm text-ink-400 dark:text-ink-500">No notifications here yet.</p>
          </div>
        )}

        <ul>
          {filtered.map((n) => (
            <NotificationRow key={n.id} notification={n} onRead={() => markRead.mutate({ id: n.id, isRead: true })} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function NotificationRow({ notification, onRead }: { notification: NotificationData; onRead: () => void }) {
  const Icon = getNotificationIcon(notification);
  const label = getNotificationLabel(notification);
  const deepLink = getNotificationDeepLink(notification);

  return (
    <li className={notification.is_read ? '' : 'bg-brand-50/40'}>
      <Link
        href={deepLink}
        onClick={onRead}
        className="flex items-start gap-3 border-t border-ink-100 dark:border-ink-800 px-4 py-3 hover:bg-ink-50 dark:hover:bg-ink-800"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-100 dark:bg-ink-800 text-ink-500 dark:text-ink-400">
          <Icon className="h-4.5 w-4.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-ink-800 dark:text-ink-100">{label}</span>
          <span className="block text-xs text-ink-400 dark:text-ink-500">{formatDistanceToNowStrict(new Date(notification.created_at), { addSuffix: true })}</span>
        </span>
        {!notification.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-label="Unread" />}
      </Link>
    </li>
  );
}
