'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  CrmAnalyticsOverview,
  CrmLeadSourceBreakdown,
  CrmPipelineFunnelBucket,
  CrmStalePipelineOpportunity,
  CrmStalePipelineParams,
  CrmTopAccount,
  CrmTopAccountsParams,
  CrmWinLossTrendParams,
  CrmWinLossTrendPoint,
} from './types';

/** GET /crm/analytics/overview — CRM Home KPI strip. */
export function useCrmAnalyticsOverview() {
  return useQuery({
    queryKey: ['crm-analytics', 'overview'],
    queryFn: async () => (await api.get<{ data: CrmAnalyticsOverview }>('/crm/analytics/overview')).data.data,
  });
}

/** GET /crm/analytics/pipeline-funnel — per-stage count + value, ordered by stage order_index. */
export function useCrmPipelineFunnel() {
  return useQuery({
    queryKey: ['crm-analytics', 'pipeline-funnel'],
    queryFn: async () => (await api.get<{ data: CrmPipelineFunnelBucket[] }>('/crm/analytics/pipeline-funnel')).data.data,
  });
}

/** GET /crm/analytics/win-loss-trend?months=6 */
export function useCrmWinLossTrend(params: CrmWinLossTrendParams = {}) {
  return useQuery({
    queryKey: ['crm-analytics', 'win-loss-trend', params],
    queryFn: async () => (await api.get<{ data: CrmWinLossTrendPoint[] }>('/crm/analytics/win-loss-trend', { params })).data.data,
  });
}

/** GET /crm/analytics/lead-sources — total/converted/conversionRate per lead_source. */
export function useCrmLeadSources() {
  return useQuery({
    queryKey: ['crm-analytics', 'lead-sources'],
    queryFn: async () => (await api.get<{ data: CrmLeadSourceBreakdown[] }>('/crm/analytics/lead-sources')).data.data,
  });
}

/** GET /crm/analytics/top-accounts?limit=10 — ranked by open pipeline value. */
export function useCrmTopAccounts(params: CrmTopAccountsParams = {}) {
  return useQuery({
    queryKey: ['crm-analytics', 'top-accounts', params],
    queryFn: async () => (await api.get<{ data: CrmTopAccount[] }>('/crm/analytics/top-accounts', { params })).data.data,
  });
}

/** GET /crm/analytics/stale-pipeline?staleDays=30 — open opportunities untouched past the threshold. */
export function useCrmStalePipeline(params: CrmStalePipelineParams = {}) {
  return useQuery({
    queryKey: ['crm-analytics', 'stale-pipeline', params],
    queryFn: async () => (await api.get<{ data: CrmStalePipelineOpportunity[] }>('/crm/analytics/stale-pipeline', { params })).data.data,
  });
}
