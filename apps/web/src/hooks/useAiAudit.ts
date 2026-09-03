'use client';

// Backed by GET /ai-audit, GET /ai-audit/:id and GET /ai-audit/compliance-summary
// — apps/api's AI governance module. Every event's actor IS the viewing user
// (no cross-user audit visibility exists yet), so there is no "actor" or
// "domain" concept to render beyond "You" / omission.

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type AiAuditEventType =
  | 'copilot.generation.completed'
  | 'copilot.generation.failed'
  | 'message.safety_classification'
  | 'messaging.smart_replies'
  | 'messaging.conversation_summary'
  | 'action.created'
  | 'action.approved'
  | 'action.rejected'
  | (string & {});

export type AiAuditPolicyDecision = 'allow' | 'require_approval' | 'block' | 'escalate';

export type AiAuditEvent = {
  id: string;
  eventType: AiAuditEventType;
  threadId: string | null;
  messageId: string | null;
  actionId: string | null;
  taskId: string | null;
  model: string | null;
  modelVersion: string | null;
  tools: string[];
  riskScore: number | null; // 0-1
  policyDecision: AiAuditPolicyDecision;
  grounding: Record<string, unknown> | null;
  immutableHash: string;
  createdAt: string;
};

export type AiAuditListResponse = { total: number; events: AiAuditEvent[] };

export type AiAuditFilters = { eventType?: string; riskMin?: number; limit: number; offset: number };

export function useAiAuditEvents(filters: AiAuditFilters) {
  return useQuery({
    queryKey: ['ai-audit', filters.eventType ?? 'all', filters.riskMin ?? null, filters.limit, filters.offset],
    queryFn: async () => {
      const { data } = await api.get<{ data: AiAuditListResponse }>('/ai-audit', {
        params: {
          eventType: filters.eventType || undefined,
          riskMin: filters.riskMin ?? undefined,
          limit: filters.limit,
          offset: filters.offset,
        },
      });
      return data.data;
    },
    staleTime: 15_000,
  });
}

export function useAiAuditEvent(id: string | null) {
  return useQuery({
    queryKey: ['ai-audit-event', id],
    queryFn: async () => (await api.get<{ data: AiAuditEvent }>(`/ai-audit/${id}`)).data.data,
    enabled: !!id,
  });
}

export type AiComplianceSummary = {
  totalEvents: number;
  highRiskEvents: number;
  manualReviewEvents: number;
  blockedEvents: number;
  complianceScore: number; // 0-100
  chainIntegrity: { ok: boolean; eventsChecked: number; brokenAt?: string };
};

export function useAiComplianceSummary() {
  return useQuery({
    queryKey: ['ai-audit-compliance-summary'],
    queryFn: async () => (await api.get<{ data: AiComplianceSummary }>('/ai-audit/compliance-summary')).data.data,
    staleTime: 30_000,
  });
}
