import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './apiClient';

export type ConversationSummary = {
  id: string;
  title: string;
  lastMessage: { body: string; createdAt: string; senderId: string } | null;
  unreadCount: number;
  updatedAt: string;
};

export type MessageData = {
  id: string;
  body: string;
  senderId: string;
  senderName: string;
  createdAt: string;
};

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: async () => (await api.get<{ data: ConversationSummary[] }>('/conversations')).data.data,
    refetchInterval: 15_000,
  });
}

export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => (await api.get<{ data: MessageData[] }>(`/conversations/${conversationId}/messages`)).data.data,
    refetchInterval: 5_000,
  });
}

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => (await api.post(`/conversations/${conversationId}/messages`, { body })).data.data,
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
  });
}
