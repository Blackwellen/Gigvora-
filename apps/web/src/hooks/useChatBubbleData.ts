'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useSocketEvent } from '@/hooks/useChatSocket';
import type { PresenceEvent } from '@/hooks/useChatSocket';
import { useConversations, type ConversationSummary } from '@/hooks/useInbox';

export type ConversationContextType = 'project' | 'recruiter' | 'sales' | 'enterprise';

type ContextResult = { data: ConversationSummary[]; isForbidden: boolean; requiredFeature: string | null; planKey: string | null };

/**
 * `GET /conversations/context/:contextType` — same shape as `GET /conversations`, but scoped to
 * one messaging surface (Sales Messages, Enterprise Messages, etc). The server is the real
 * authority on the plan gate (apps/api/src/modules/messaging/messaging.controller.js
 * #CONTEXT_FEATURE_GATE) and answers 403 `{error, details:{feature, planKey}}` when the caller
 * isn't entitled — this hook surfaces that as `isForbidden` rather than throwing, so the calling
 * page can render its locked upsell state instead of an error boundary. `retry:false` since a 403
 * will never succeed on retry.
 */
export function useConversationsByContext(contextType: ConversationContextType) {
  const query = useQuery({
    queryKey: ['conversations', 'context', contextType],
    queryFn: async (): Promise<ContextResult> => {
      try {
        const res = await api.get<{ data: ConversationSummary[] }>(`/conversations/context/${contextType}`);
        return { data: res.data.data, isForbidden: false, requiredFeature: null, planKey: null };
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 403) {
          const details = (err.response.data as { details?: { feature?: string; planKey?: string } } | undefined)?.details;
          return { data: [], isForbidden: true, requiredFeature: details?.feature ?? null, planKey: details?.planKey ?? null };
        }
        throw err;
      }
    },
    retry: false,
  });

  return {
    data: query.data?.data ?? [],
    isLoading: query.isLoading,
    isForbidden: query.data?.isForbidden ?? false,
    requiredFeature: query.data?.requiredFeature ?? null,
    planKey: query.data?.planKey ?? null,
    error: query.error,
  };
}

export type DirectoryPerson = { id: string; first_name: string; last_name: string; headline: string | null; account_type?: string };

/** Live directory search across people — backs the Contacts tab and the
 * "new group chat" member picker. Reuses the existing cross-entity /search
 * endpoint (apps/api/src/modules/search) rather than inventing a new one. */
export function useDirectorySearch(query: string) {
  return useQuery({
    queryKey: ['chat-bubble-directory-search', query],
    queryFn: async () => (await api.get<{ data: { people: DirectoryPerson[] } }>('/search', { params: { q: query } })).data.data.people,
    enabled: query.trim().length >= 2,
  });
}

/** Default contact list shown before the user types a search query — the
 * most recently active people (best-effort proxy for "your network" since
 * a dedicated connections-list-with-profile endpoint isn't wired yet). */
export function useSuggestedContacts() {
  return useQuery({
    queryKey: ['chat-bubble-suggested-contacts'],
    queryFn: async () => (await api.get<{ data: { people: DirectoryPerson[] } }>('/search', { params: { q: 'a' } })).data.data.people,
    staleTime: 60_000,
  });
}

export type ChannelSummary = {
  id: string;
  title: string;
  topic: string | null;
  isPublic: boolean;
  memberCount?: number;
  joined?: boolean;
};

/** Reuses the same GET /conversations cache that powers the Chats tab
 * (apps/web/src/hooks/useInbox.ts) rather than firing a second request. */
export function useJoinedChannels() {
  const { data: conversations, isLoading } = useConversations();
  const channels: ChannelSummary[] = (conversations || [])
    .filter((c) => c.type === 'channel')
    .map((c) => ({ id: c.id, title: c.title, topic: c.topic ?? null, isPublic: Boolean(c.isPublic), joined: true }));
  return { data: channels, isLoading };
}

export function usePublicChannels(search: string) {
  return useQuery({
    queryKey: ['chat-bubble-channels', 'public', search],
    queryFn: async () => {
      try {
        return (await api.get<{ data: ChannelSummary[] }>('/conversations/channels', { params: { q: search || undefined } })).data.data;
      } catch {
        return [];
      }
    },
    retry: false,
  });
}

export function useJoinChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (channelId: string) => (await api.post(`/conversations/${channelId}/join`)).data.data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-bubble-channels'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useCreateChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { title: string; topic?: string; isPublic: boolean }) =>
      (
        await api.post('/conversations', {
          type: 'channel',
          title: payload.title,
          topic: payload.topic,
          isPublic: payload.isPublic,
        })
      ).data.data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-bubble-channels'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

/** Group DM creation via POST /conversations {type:'group', ...}. */
export function useCreateGroupConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { title: string; participantIds: string[] }) =>
      (
        await api.post<{ data: { conversationId: string } | { id: string } }>('/conversations', {
          type: 'group',
          title: payload.title,
          participantIds: payload.participantIds,
        })
      ).data.data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
  });
}

export type UploadedAttachment = { type: 'image' | 'video' | 'document'; url: string; fileName: string; fileSize: number };

/** Reuses the existing feed attachment upload pipeline (Cloudflare R2-backed,
 * apps/api/src/modules/posts) since messaging doesn't have its own upload
 * route — the resulting URL is passed straight through as a message attachment. */
export function useUploadAttachment() {
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return (await api.post<{ data: UploadedAttachment }>('/feed/attachments', form, { headers: { 'Content-Type': 'multipart/form-data' } })).data.data;
    },
  });
}

export type SharedFile = { id: string; fileName: string; url: string; fileSize?: number; type?: string; createdAt?: string };
export type SharedLink = { id: string; title: string; url: string; createdAt?: string };
export type ActivityEntry = { id: string; actorName: string; action: string; createdAt: string };
export type ConversationDetail = {
  sharedFiles: SharedFile[];
  sharedLinks: SharedLink[];
  recentActivity: ActivityEntry[];
};

/** New `/conversations/:id/detail` endpoint (shared files / links / activity for the right
 * rail). Backend is being built concurrently — degrade to `null` on 404/network error so the
 * calling page can hide these cards entirely instead of showing fake data. */
export function useConversationDetail(conversationId: string | null) {
  return useQuery({
    queryKey: ['conversation-detail', conversationId],
    queryFn: async () => {
      try {
        return (await api.get<{ data: ConversationDetail }>(`/conversations/${conversationId}/detail`)).data.data;
      } catch {
        return null;
      }
    },
    enabled: Boolean(conversationId),
    retry: false,
  });
}

export type ConversationSummaryDoc = { id: string; summary: string; createdAt: string } | null;

/** `GET /conversations/:id/summary/latest` — most recently generated AI summary. `ok:false` /
 * 404 is treated as "no summary yet", not an error. */
export function useConversationSummaryLatest(conversationId: string | null) {
  return useQuery({
    queryKey: ['conversation-summary-latest', conversationId],
    queryFn: async () => {
      try {
        const res = await api.get<{ data: { ok: boolean; summary?: ConversationSummaryDoc } }>(`/conversations/${conversationId}/summary/latest`);
        return res.data.data.ok ? res.data.data.summary ?? null : null;
      } catch {
        return null;
      }
    },
    enabled: Boolean(conversationId),
    retry: false,
  });
}

/** `POST /conversations/:id/summary` — generates and persists a new AI summary on demand. */
export function useGenerateConversationSummary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) => {
      const res = await api.post<{ data: { ok: boolean; summary?: ConversationSummaryDoc } }>(`/conversations/${conversationId}/summary`);
      return res.data.data.ok ? res.data.data.summary ?? null : null;
    },
    onSuccess: (_data, conversationId) => {
      queryClient.invalidateQueries({ queryKey: ['conversation-summary-latest', conversationId] });
    },
  });
}

/** `GET /conversations/groups` — group-type conversations only. Falls back to filtering the
 * already-cached `useConversations()` list client-side (same pattern as `useJoinedChannels`
 * above) when the dedicated endpoint isn't available yet. */
export function useGroupConversations() {
  const { data: conversations, isLoading: conversationsLoading } = useConversations();
  const dedicated = useQuery({
    queryKey: ['conversations', 'groups'],
    queryFn: async () => (await api.get<{ data: ConversationSummary[] }>('/conversations/groups')).data.data,
    retry: false,
    // Only worth trying once the fallback data is known, so we always have something to show.
  });
  if (dedicated.data) return { data: dedicated.data, isLoading: dedicated.isLoading, usedFallback: false };
  const fallback = (conversations || []).filter((c) => c.type === 'group' || c.isGroup);
  return { data: fallback, isLoading: conversationsLoading, usedFallback: true };
}

export type ConversationPin = { id: string; messageId: string; body: string; pinnedByName?: string; createdAt?: string };

/** `GET /conversations/:id/pins` — pinned-message banner for group chats. Graceful-empty when
 * the endpoint isn't available yet. */
export function useConversationPins(conversationId: string | null) {
  return useQuery({
    queryKey: ['conversation-pins', conversationId],
    queryFn: async () => {
      try {
        return (await api.get<{ data: ConversationPin[] }>(`/conversations/${conversationId}/pins`)).data.data;
      } catch {
        return [];
      }
    },
    enabled: Boolean(conversationId),
    retry: false,
  });
}

export type PollOption = { text: string; voteCount: number };
export type PollData = { id: string; question: string; options: PollOption[]; totalVotes: number; closesAt?: string | null; myVoteIndex?: number | null };

/** `GET /conversations/polls/:pollId` for rendering a poll message's live vote state. */
export function usePoll(pollId: string | null) {
  return useQuery({
    queryKey: ['poll', pollId],
    queryFn: async () => {
      try {
        return (await api.get<{ data: PollData }>(`/conversations/polls/${pollId}`)).data.data;
      } catch {
        return null;
      }
    },
    enabled: Boolean(pollId),
    retry: false,
  });
}

export function useVotePoll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ pollId, optionIndex }: { pollId: string; optionIndex: number }) =>
      (await api.post<{ data: PollData }>(`/conversations/polls/${pollId}/vote`, { optionIndex })).data.data,
    onSuccess: (_data, { pollId }) => {
      queryClient.invalidateQueries({ queryKey: ['poll', pollId] });
    },
  });
}

export function useCreatePoll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, question, options, closesAt }: { conversationId: string; question: string; options: string[]; closesAt?: string }) =>
      (await api.post(`/conversations/${conversationId}/polls`, { question, options, closesAt })).data.data,
    onSuccess: (_data, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    },
  });
}

/** `PATCH /conversations/:id/membership` — the current user's own pin/mute of a conversation,
 * backing the Inbox list's Pinned tab. */
export function useUpdateConversationMembership() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, isPinned, isMuted }: { conversationId: string; isPinned?: boolean; isMuted?: boolean }) =>
      (await api.patch(`/conversations/${conversationId}/membership`, { isPinned, isMuted })).data.data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export type SmartReplySuggestion = string;

/** `POST /conversations/:id/smart-replies` — `ok:false` is a normal "AI unavailable" response,
 * never surfaced as an error. */
export function useSmartReplies() {
  return useMutation({
    mutationFn: async (conversationId: string) => {
      try {
        const res = await api.post<{ data: { ok: boolean; replies: SmartReplySuggestion[] } }>(`/conversations/${conversationId}/smart-replies`);
        return res.data.data.ok ? res.data.data.replies : [];
      } catch {
        return [] as SmartReplySuggestion[];
      }
    },
  });
}

// `useConversationsByContext` (GET /conversations/context/:contextType, with 403/plan-gate
// detection) lives near the top of this file — added once, shared by every context-scoped
// messaging surface (Sales/Enterprise/Project/Recruiter Messages) rather than duplicated here.
export type ContextConversationSummary = ConversationSummary & {
  contextType?: ConversationContextType | null;
  contextId?: string | null;
  isPinned?: boolean;
  isMuted?: boolean;
};

/**
 * Client-side presence tracking. The server only broadcasts
 * presence:online / presence:offline deltas (apps/api/src/websocket/handlers/presence.js)
 * — there is no bulk "who's online" snapshot endpoint yet — so this hook
 * accumulates a running set from those deltas for the lifetime of the app.
 * A conversation partner who was already online before this tab connected
 * won't show a dot until they send the next delta (reconnect, tab focus, etc).
 */
const onlineUserIds = new Set<string>();
const presenceListeners = new Set<() => void>();

export function usePresence() {
  const [, forceRender] = useState(0);

  useSocketEvent<PresenceEvent>('presence:online', (payload) => {
    onlineUserIds.add(payload.userId);
    presenceListeners.forEach((fn) => fn());
  });
  useSocketEvent<PresenceEvent>('presence:offline', (payload) => {
    onlineUserIds.delete(payload.userId);
    presenceListeners.forEach((fn) => fn());
  });

  useEffect(() => {
    const rerender = () => forceRender((n) => n + 1);
    presenceListeners.add(rerender);
    return () => {
      presenceListeners.delete(rerender);
    };
  }, []);

  return {
    isOnline: (userId: string) => onlineUserIds.has(userId),
  };
}
