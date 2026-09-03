'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useSocketEvent } from '@/hooks/useChatSocket';

export type CopilotSource = { sourceType: string; sourceId: string | null; label: string; route: string };
export type GroundingState = 'none' | 'grounded' | 'unavailable';

export type CopilotMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  modelId?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  latencyMs?: number | null;
  groundingState: GroundingState;
  sources: CopilotSource[];
  createdAt: string;
};

export type CopilotThread = {
  id: string;
  title: string | null;
  status: string;
  modelPreference?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CopilotThreadDetail = CopilotThread & { messages: CopilotMessage[] };

export type CopilotSummary = {
  newPosts: number;
  unreadNotifications: number;
  unreadMessages: number;
  savedItems: number;
  pendingWorkspaceInvites: number;
};

export const COPILOT_PROMPTS = ['Summarize my feed', 'Draft a post about a project launch', 'What are my saved items?'];

const GENERIC_FAILURE_MESSAGE = "Copilot couldn't respond just now — try again in a moment.";

/**
 * Copilot logic backed by the real thread + streaming API (GET/POST
 * /copilot/threads*) — replaces the old deterministic /copilot/ask v0. A
 * thread is created lazily on the first message unless one is passed in (or
 * selected later via `selectThread`). The live assistant reply is driven by
 * `ai.generation.*` socket events broadcast to the user's own room (see
 * useChatSocket's useSocketEvent) while the underlying POST .../messages
 * call is still in flight server-side; the awaited HTTP response is kept
 * only as a fallback reconciliation path in case a socket event is missed
 * (e.g. a brief reconnect), guarded by `settledRef` so the UI is never
 * updated twice for the same turn.
 */
export function useCopilot(initialThreadId?: string | null) {
  const queryClient = useQueryClient();
  const [threadId, setThreadId] = useState<string | null>(initialThreadId ?? null);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [streamError, setStreamError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const streamingThreadRef = useRef<string | null>(null);
  const settledRef = useRef(true);
  const pendingOptimisticIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (initialThreadId !== undefined) setThreadId(initialThreadId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialThreadId]);

  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['copilot-summary'],
    queryFn: async () => (await api.get<{ data: CopilotSummary }>('/copilot/summary')).data.data,
  });

  const { data: thread, isLoading: isThreadLoading } = useQuery({
    queryKey: ['copilot-thread', threadId],
    queryFn: async () => (await api.get<{ data: CopilotThreadDetail }>(`/copilot/threads/${threadId}`)).data.data,
    enabled: !!threadId,
  });

  // Once a thread loads (fresh selection, or a page landing on ?threadId=),
  // seed local message state from the persisted history.
  useEffect(() => {
    if (thread?.id === threadId && thread.messages) setMessages(thread.messages);
  }, [thread, threadId]);

  const createThreadMutation = useMutation({
    mutationFn: async (input?: string | { title?: string; context?: { projectId?: string } }) => {
      const body = typeof input === 'string' || input === undefined ? { title: input } : input;
      return (await api.post<{ data: CopilotThread }>('/copilot/threads', body)).data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['copilot-threads'] }),
  });

  const postMessageMutation = useMutation({
    mutationFn: async ({ id, message }: { id: string; message: string }) =>
      (
        await api.post<{ data: { ok: boolean; reason?: string; userMessage: CopilotMessage; assistantMessage?: CopilotMessage } }>(
          `/copilot/threads/${id}/messages`,
          { message }
        )
      ).data.data,
  });

  const createNewThread = useCallback(
    async (options?: { title?: string; context?: { projectId?: string } }) => {
      const created = await createThreadMutation.mutateAsync(options);
      setThreadId(created.id);
      setMessages([]);
      setStreamingText('');
      setIsStreaming(false);
      setStreamError(null);
      return created;
    },
    [createThreadMutation]
  );

  const selectThread = useCallback((id: string | null) => {
    setThreadId(id);
    setMessages([]);
    setStreamingText('');
    setIsStreaming(false);
    setStreamError(null);
  }, []);

  const send = useCallback(
    async (message: string) => {
      const trimmed = message.trim();
      if (!trimmed) return null;
      setDraft('');
      setStreamError(null);

      let id = threadId;
      if (!id) {
        const created = await createThreadMutation.mutateAsync(undefined);
        id = created.id;
        setThreadId(id);
      }

      const optimisticId = `optimistic-${Date.now()}`;
      pendingOptimisticIdRef.current = optimisticId;
      setMessages((m) => [
        ...m,
        { id: optimisticId, role: 'user', content: trimmed, groundingState: 'none', sources: [], createdAt: new Date().toISOString() },
      ]);

      streamingThreadRef.current = id;
      settledRef.current = false;
      setIsStreaming(true);
      setStreamingText('');

      try {
        const result = await postMessageMutation.mutateAsync({ id, message: trimmed });
        // Fallback path — only fires if no socket event settled this turn already.
        if (!settledRef.current) {
          settledRef.current = true;
          streamingThreadRef.current = null;
          setIsStreaming(false);
          setStreamingText('');
          setMessages((m) => m.map((msg) => (msg.id === optimisticId ? result.userMessage : msg)));
          if (result.ok && result.assistantMessage) {
            setMessages((m) => [...m, result.assistantMessage as CopilotMessage]);
          } else {
            setStreamError(GENERIC_FAILURE_MESSAGE);
          }
        }
        queryClient.invalidateQueries({ queryKey: ['copilot-threads'] });
        return result;
      } catch {
        if (!settledRef.current) {
          settledRef.current = true;
          streamingThreadRef.current = null;
          setIsStreaming(false);
          setStreamingText('');
          setStreamError(GENERIC_FAILURE_MESSAGE);
        }
        return null;
      }
    },
    [threadId, createThreadMutation, postMessageMutation, queryClient]
  );

  const cancel = useCallback(async () => {
    if (!threadId) return;
    try {
      await api.post(`/copilot/threads/${threadId}/cancel`);
    } catch {
      // best-effort — the cancelled/failed socket event (or the awaited
      // postMessage rejection) still resolves the streaming UI either way.
    }
  }, [threadId]);

  useSocketEvent<{ threadId: string; userMessageId: string }>('ai.generation.started', (payload) => {
    if (payload.threadId !== streamingThreadRef.current) return;
    const pendingId = pendingOptimisticIdRef.current;
    if (!pendingId) return;
    setMessages((m) => m.map((msg) => (msg.id === pendingId ? { ...msg, id: payload.userMessageId } : msg)));
    pendingOptimisticIdRef.current = null;
  });

  useSocketEvent<{ threadId: string; delta: string }>('ai.generation.delta', (payload) => {
    if (payload.threadId !== streamingThreadRef.current) return;
    setStreamingText((t) => t + payload.delta);
  });

  useSocketEvent<{ threadId: string; message: CopilotMessage }>('ai.generation.completed', (payload) => {
    if (payload.threadId !== streamingThreadRef.current || settledRef.current) return;
    settledRef.current = true;
    streamingThreadRef.current = null;
    setIsStreaming(false);
    setStreamingText('');
    setMessages((m) => [...m, payload.message]);
    queryClient.invalidateQueries({ queryKey: ['copilot-thread', payload.threadId] });
    queryClient.invalidateQueries({ queryKey: ['copilot-threads'] });
  });

  useSocketEvent<{ threadId: string; reason: string }>('ai.generation.failed', (payload) => {
    if (payload.threadId !== streamingThreadRef.current || settledRef.current) return;
    settledRef.current = true;
    streamingThreadRef.current = null;
    setIsStreaming(false);
    setStreamingText('');
    setStreamError(GENERIC_FAILURE_MESSAGE);
  });

  useSocketEvent<{ threadId: string; reason: string }>('ai.generation.cancelled', (payload) => {
    if (payload.threadId !== streamingThreadRef.current || settledRef.current) return;
    settledRef.current = true;
    streamingThreadRef.current = null;
    setIsStreaming(false);
    setStreamingText('');
    setStreamError(null);
  });

  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === 'assistant');

  return {
    threadId,
    thread,
    isThreadLoading,
    messages,
    isStreaming,
    streamingText,
    streamError,
    sources: lastAssistantMessage?.sources ?? [],
    lastAssistantMessage,
    send,
    cancel,
    createNewThread,
    selectThread,
    draft,
    setDraft,
    isSending: postMessageMutation.isPending || createThreadMutation.isPending,
    summary,
    isSummaryLoading,
  };
}
