'use client';

import { useQueries, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CopilotMessage, CopilotThread } from '@/hooks/useCopilot';

export type ChatSessionsTab = 'all' | 'my' | 'pinned' | 'shared' | 'team';

/**
 * "Chat sessions" is not a separate backend concept — a session IS an AI
 * copilot thread (GET /copilot/threads). There is no pin/share/team field on
 * a thread yet, so:
 *  - 'all' and 'my' both render the same real list, since every thread
 *    already belongs only to the requesting user (threads are user-scoped
 *    server-side — there is no cross-user visibility to distinguish "my"
 *    from "all" against).
 *  - 'pinned' / 'shared' / 'team' have no backing field at all and must not
 *    be faked with placeholder rows — callers should render an honest
 *    "not available yet" empty state for those tabs instead.
 */
export function useChatSessions() {
  return useQuery({
    queryKey: ['copilot-threads'],
    queryFn: async () => (await api.get<{ data: CopilotThread[] }>('/copilot/threads')).data.data,
  });
}

export function rowsForTab(threads: CopilotThread[] | undefined, tab: ChatSessionsTab): CopilotThread[] {
  if (!threads) return [];
  if (tab === 'all' || tab === 'my') return threads;
  return []; // pinned / shared / team — no backend concept yet, honest empty state
}

/**
 * Per-thread "model used" lookup. The thread list endpoint doesn't include
 * the model of the most recent message, so this fetches each thread's full
 * detail (same GET /copilot/threads/:id used to open a conversation) to
 * read the last assistant message's modelId + groundingState. Kept as its
 * own hook so callers that don't need this (e.g. a plain list) don't pay
 * for N extra requests.
 */
export function useThreadModelInfo(threadIds: string[]) {
  const results = useQueries({
    queries: threadIds.map((id) => ({
      queryKey: ['copilot-thread', id],
      queryFn: async () => (await api.get<{ data: { id: string; messages: CopilotMessage[] } }>(`/copilot/threads/${id}`)).data.data,
      staleTime: 60_000,
    })),
  });

  const byThreadId: Record<string, { modelId: string | null; grounded: boolean; sourceCount: number } | undefined> = {};
  results.forEach((r, i) => {
    const id = threadIds[i];
    if (!r.data) return;
    const assistantMessages = r.data.messages.filter((m) => m.role === 'assistant');
    const last = assistantMessages[assistantMessages.length - 1];
    byThreadId[id] = last
      ? { modelId: last.modelId ?? null, grounded: last.groundingState === 'grounded', sourceCount: last.sources?.length ?? 0 }
      : undefined;
  });

  return { byThreadId, isLoading: results.some((r) => r.isLoading) };
}
