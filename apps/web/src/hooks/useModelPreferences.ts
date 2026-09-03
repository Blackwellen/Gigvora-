'use client';

// Backed by GET /ai-model-preferences/available-models, GET/PATCH
// /ai-model-preferences (apps/api/src/modules/ai/modelPreferences.service.js).
//
// IMPORTANT — real vs. saved-only:
// - `defaultModel` / `fallbackModel` are genuinely consumed: copilotOrchestrator
//   calls resolveModelForUser() and does a real automatic fallback-model retry.
// - `routingStrategy` / `reasoningMode` / `retrievalConfig` / `toolConfig` /
//   `safetyConfig` / `budgetConfig` are PERSISTED but NOT read by the
//   orchestrator yet — label those "Saved — not yet applied to generation".
//
// The server's updatePreferences() REPLACES each nested config object
// wholesale when present in the patch (it does not deep-merge individual
// keys within retrievalConfig/toolConfig/safetyConfig/budgetConfig), so
// callers must always send the FULL nested object for any section they are
// changing, not just the changed key.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type RoutingStrategy = 'balanced' | 'quality' | 'speed' | 'cost';
export type ReasoningMode = 'auto' | 'fast' | 'thorough';
export type SafetyLevel = 'strict' | 'standard' | 'relaxed';

export type RetrievalConfig = {
  webGrounding: boolean;
  workspaceFiles: boolean;
  companyData: boolean;
};

export type ToolConfig = {
  webSearch: boolean;
  files: boolean;
  calculator: boolean;
};

export type SafetyConfig = {
  level: SafetyLevel;
  piiRedaction: boolean;
};

export type BudgetConfig = {
  requestsPerMinute: number;
  tokensPerMinute: number;
  dailyBudgetUsd: number;
};

export type ModelPreferences = {
  defaultModel: string;
  fallbackModel: string;
  routingStrategy: RoutingStrategy;
  reasoningMode: ReasoningMode;
  retrievalConfig: RetrievalConfig;
  toolConfig: ToolConfig;
  safetyConfig: SafetyConfig;
  budgetConfig: BudgetConfig;
  isDefault: boolean;
};

export type AvailableModel = {
  id: string;
  label: string;
  provider: string;
  capabilities: string[];
  contextWindow: number;
  latencyClass: string;
};

export const DEFAULT_MODEL_PREFERENCES: Omit<ModelPreferences, 'defaultModel' | 'fallbackModel'> & {
  defaultModel: string;
  fallbackModel: string;
} = {
  defaultModel: '',
  fallbackModel: '',
  routingStrategy: 'balanced',
  reasoningMode: 'auto',
  retrievalConfig: { webGrounding: false, workspaceFiles: true, companyData: true },
  toolConfig: { webSearch: false, files: true, calculator: false },
  safetyConfig: { level: 'standard', piiRedaction: true },
  budgetConfig: { requestsPerMinute: 60, tokensPerMinute: 100000, dailyBudgetUsd: 20 },
  isDefault: true,
};

export const MODEL_PREFERENCES_QUERY_KEY = ['ai-model-preferences'] as const;
export const AVAILABLE_MODELS_QUERY_KEY = ['ai-model-preferences', 'available-models'] as const;

/** The real (currently two-model) registry. Never render a model id/label
 * that isn't in this list — the reference mockup's GPT-4o/Claude/Gemini
 * names do not apply to this backend. */
export function useAvailableModels() {
  return useQuery({
    queryKey: AVAILABLE_MODELS_QUERY_KEY,
    queryFn: async (): Promise<AvailableModel[]> => {
      try {
        const { data } = await api.get<{ data: AvailableModel[] }>('/ai-model-preferences/available-models');
        return Array.isArray(data?.data) ? data.data : [];
      } catch {
        return [];
      }
    },
    retry: false,
    throwOnError: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useModelPreferences() {
  return useQuery({
    queryKey: MODEL_PREFERENCES_QUERY_KEY,
    queryFn: async (): Promise<ModelPreferences> => {
      const { data } = await api.get<{ data: ModelPreferences }>('/ai-model-preferences');
      return data.data;
    },
    retry: false,
    throwOnError: false,
  });
}

/** Sends a partial patch, optimistically merging it into the cache (shallow
 * only — callers must pass full nested objects for any config section they
 * change, per the note above) with rollback on failure. */
export function useUpdateModelPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: Partial<ModelPreferences>) => {
      const { data } = await api.patch<{ data: ModelPreferences }>('/ai-model-preferences', patch);
      return data.data;
    },
    onMutate: async (patch: Partial<ModelPreferences>) => {
      await queryClient.cancelQueries({ queryKey: MODEL_PREFERENCES_QUERY_KEY });
      const previous = queryClient.getQueryData<ModelPreferences>(MODEL_PREFERENCES_QUERY_KEY);
      if (previous) {
        queryClient.setQueryData(MODEL_PREFERENCES_QUERY_KEY, { ...previous, ...patch });
      }
      return { previous };
    },
    onError: (_err, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(MODEL_PREFERENCES_QUERY_KEY, context.previous);
      }
    },
    onSuccess: (merged) => {
      queryClient.setQueryData(MODEL_PREFERENCES_QUERY_KEY, merged);
    },
  });
}
