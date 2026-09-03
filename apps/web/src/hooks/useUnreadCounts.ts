'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useUnreadCounts() {
  const { data: unreadMessages } = useQuery({
    queryKey: ['unread-messages'],
    queryFn: async () => (await api.get<{ data: { count: number } }>('/conversations/unread-count')).data.data.count,
    refetchInterval: 30_000,
  });

  const { data: unreadNotifications } = useQuery({
    queryKey: ['unread-notifications'],
    queryFn: async () => (await api.get<{ data: { count: number } }>('/notifications/unread-count')).data.data.count,
    refetchInterval: 30_000,
  });

  return { unreadMessages: unreadMessages ?? 0, unreadNotifications: unreadNotifications ?? 0 };
}
