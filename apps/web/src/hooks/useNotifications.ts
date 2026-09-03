'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, MessageCircle, UserPlus, Bell, Mail, Calendar, Sparkles, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';

export type NotificationData = {
  id: string;
  user_id: string;
  type: string;
  payload: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
};

export const NOTIFICATION_TYPE_META: Record<string, { icon: typeof Bell; label: (p: Record<string, unknown>) => string }> = {
  'post.reaction': { icon: Heart, label: (p) => `${p.actorName} reacted to your post` },
  'post.comment': { icon: MessageCircle, label: (p) => `${p.actorName} commented on your post` },
  'comment.reply': { icon: MessageCircle, label: (p) => `${p.actorName} replied to your comment` },
  'connection.request': { icon: UserPlus, label: (p) => `${p.actorName} sent you a connection request` },
  'message_request.created': { icon: Mail, label: (p) => `${p.actorName} sent you a message request` },
  'meeting.invited': { icon: Calendar, label: (p) => `${p.actorName} invited you to "${p.meetingTitle}"` },
  'ai.task.completed': { icon: Sparkles, label: () => 'Your AI task finished' },
  'ai.task.failed': { icon: AlertTriangle, label: () => 'An AI task failed to complete' },
};

export function getNotificationIcon(notification: NotificationData) {
  return NOTIFICATION_TYPE_META[notification.type]?.icon || Bell;
}

export function getNotificationLabel(notification: NotificationData) {
  const meta = NOTIFICATION_TYPE_META[notification.type];
  return meta ? meta.label(notification.payload) : notification.type;
}

export function getNotificationDeepLink(notification: NotificationData) {
  return (notification.payload.deepLink as string) || '/app/live-feed';
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get<{ data: NotificationData[] }>('/notifications', { params: { limit: 50 } })).data.data,
    refetchInterval: 45_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isRead }: { id: string; isRead: boolean }) => api.patch(`/notifications/${id}`, { is_read: isRead }),
    onMutate: async ({ id, isRead }) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const previous = queryClient.getQueryData<NotificationData[]>(['notifications']);
      queryClient.setQueryData<NotificationData[]>(['notifications'], (old) =>
        old?.map((n) => (n.id === id ? { ...n, is_read: isRead } : n))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['notifications'], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => Promise.all(ids.map((id) => api.patch(`/notifications/${id}`, { is_read: true }))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
    },
  });
}
