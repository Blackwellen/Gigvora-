'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type ConversationSummary = {
  id: string;
  isGroup: boolean;
  title: string;
  participants: Array<{ id: string; name: string }>;
  lastMessage: { body: string; createdAt: string; senderId: string } | null;
  unreadCount: number;
  updatedAt: string;
  type?: 'dm' | 'group' | 'channel';
  topic?: string | null;
  isPublic?: boolean;
};

export type MessageData = {
  id: string;
  body: string;
  senderId: string;
  senderName: string;
  attachments: unknown[];
  createdAt: string;
  editedAt: string | null;
  // Optional — populated once the backend's poll-message support lands. A message with
  // messageType 'poll' carries a pollId that the thread renders as a live poll card.
  messageType?: 'text' | 'poll';
  pollId?: string | null;
};

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: async () => (await api.get<{ data: ConversationSummary[] }>('/conversations')).data.data,
    refetchInterval: 15_000,
  });
}

export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => (await api.get<{ data: MessageData[] }>(`/conversations/${conversationId}/messages`)).data.data,
    enabled: Boolean(conversationId),
    refetchInterval: conversationId ? 5_000 : false,
  });
}

export function useSendMessage(conversationId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => (await api.post(`/conversations/${conversationId}/messages`, { body })).data.data as MessageData,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) => api.post(`/conversations/${conversationId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages'] });
    },
  });
}

export function useUnreadMessageCount() {
  return useQuery({
    queryKey: ['unread-messages'],
    queryFn: async () => (await api.get<{ data: { count: number } }>('/conversations/unread-count')).data.data.count,
    refetchInterval: 20_000,
  });
}

export function useStartConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => (await api.post('/conversations/direct', { userId })).data.data.conversationId as string,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
  });
}
