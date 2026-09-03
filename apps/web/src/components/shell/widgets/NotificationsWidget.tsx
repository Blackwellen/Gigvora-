'use client';

import Link from 'next/link';
import { formatDistanceToNowStrict } from 'date-fns';
import { Bell, CheckCheck } from 'lucide-react';
import { usePopoverClose } from '@/components/ui/Popover';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  getNotificationIcon,
  getNotificationLabel,
  getNotificationDeepLink,
  type NotificationData,
} from '@/hooks/useNotifications';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { WidgetDropdown, WidgetLoadingSkeleton, WidgetEmptyState, WidgetErrorState } from './WidgetDropdown';

export function NotificationsWidget() {
  const { data: notifications, isLoading, isError } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const { unreadNotifications } = useUnreadCounts();

  const recent = (notifications || []).slice(0, 8);
  const unreadIds = (notifications || []).filter((n) => !n.is_read).map((n) => n.id);

  return (
    <WidgetDropdown
      label="Notifications"
      icon={Bell}
      count={unreadNotifications}
      title="Notifications"
      viewAllHref="/app/notifications-tray"
      dataTourAnchor="notifications"
      headerAction={
        unreadIds.length > 0 ? (
          <button
            type="button"
            onClick={() => markAllRead.mutate(unreadIds)}
            disabled={markAllRead.isPending}
            title="Mark all read"
            aria-label="Mark all read"
            className="rounded-md p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 disabled:opacity-40 dark:text-ink-500 dark:hover:bg-ink-800 dark:hover:text-ink-100"
          >
            <CheckCheck className="h-3.5 w-3.5" />
          </button>
        ) : null
      }
    >
      {isLoading && <WidgetLoadingSkeleton />}
      {isError && <WidgetErrorState />}
      {!isLoading && !isError && recent.length === 0 && (
        <WidgetEmptyState icon={Bell} message="No new notifications" hint="You're all caught up." />
      )}
      {!isLoading && recent.length > 0 && (
        <ul className="space-y-0.5">
          {recent.map((n) => (
            <NotificationRow key={n.id} notification={n} onRead={() => !n.is_read && markRead.mutate({ id: n.id, isRead: true })} />
          ))}
        </ul>
      )}
    </WidgetDropdown>
  );
}

function NotificationRow({ notification, onRead }: { notification: NotificationData; onRead: () => void }) {
  const close = usePopoverClose();
  const Icon = getNotificationIcon(notification);
  const label = getNotificationLabel(notification);
  const deepLink = getNotificationDeepLink(notification);

  return (
    <li>
      <Link
        href={deepLink}
        onClick={() => {
          onRead();
          close();
        }}
        className={`flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-ink-50 dark:hover:bg-ink-800 ${
          notification.is_read ? '' : 'bg-brand-50/60 dark:bg-brand-500/5'
        }`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400">
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-ink-800 dark:text-ink-100">{label}</span>
          <span className="block text-xs text-ink-400 dark:text-ink-500">
            {formatDistanceToNowStrict(new Date(notification.created_at), { addSuffix: true })}
          </span>
        </span>
        {!notification.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-label="Unread" />}
      </Link>
    </li>
  );
}
