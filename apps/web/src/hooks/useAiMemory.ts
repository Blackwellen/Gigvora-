'use client';

// Backed by GET/POST/DELETE /ai-memory + /ai-memory/reset + /ai-memory/export
// (apps/api/src/modules/ai/memory.service.js). Every memory is EXPLICIT and
// user-triggered — there is no automatic extraction from conversations on
// this backend, so this hook (and any UI built on it) must not imply passive
// memory capture. Real memories are appended into Copilot's context on every
// generation (see memory.service.js#getMemorySummaryForContext), so this
// data genuinely affects Copilot's answers.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type MemoryType = 'preference' | 'fact' | 'entity';

export type AiMemory = {
  id: string;
  memoryType: MemoryType;
  memoryKey: string | null;
  value: unknown;
  sourceType: string;
  classification: string;
  approvalState: string;
  createdAt: string;
};

export type AiMemoryExport = {
  exportedAt: string;
  memories: AiMemory[];
};

export const AI_MEMORY_QUERY_KEY = ['ai-memory'] as const;

/** Fetches the current user's explicit memories, newest first. Degrades to
 * an empty list on any failure instead of throwing, matching the pattern
 * used by useEntitlements / useMessagingSettings. */
export function useAiMemories() {
  return useQuery({
    queryKey: AI_MEMORY_QUERY_KEY,
    queryFn: async (): Promise<AiMemory[]> => {
      try {
        const { data } = await api.get<{ data: AiMemory[] }>('/ai-memory');
        return Array.isArray(data?.data) ? data.data : [];
      } catch {
        return [];
      }
    },
    retry: false,
    throwOnError: false,
  });
}

/** Creates an explicit memory. The server rejects obviously sensitive
 * content (passwords, SSNs, card numbers, API keys) with a 422 — callers
 * should surface that error message via getApiErrorMessage(). */
export function useCreateAiMemory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { memoryType?: MemoryType; memoryKey?: string; value: string }) => {
      const { data } = await api.post<{ data: AiMemory }>('/ai-memory', input);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_MEMORY_QUERY_KEY });
    },
  });
}

export function useDeleteAiMemory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/ai-memory/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_MEMORY_QUERY_KEY });
    },
  });
}

/** Deletes ALL of the user's memories. Returns the number deleted. */
export function useResetAiMemories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ data: { deleted: number } }>('/ai-memory/reset');
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_MEMORY_QUERY_KEY });
    },
  });
}

/** Fetches the raw export payload — the caller (settings page) builds a
 * Blob from it and triggers a real file download, no fake file. */
export function useExportAiMemories() {
  return useMutation({
    mutationFn: async (): Promise<AiMemoryExport> => {
      const { data } = await api.get<{ data: AiMemoryExport }>('/ai-memory/export');
      return data.data;
    },
  });
}
