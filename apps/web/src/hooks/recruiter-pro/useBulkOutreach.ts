'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { BulkOutreachCampaign, BulkOutreachVariant, OutreachChannel } from './types';

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['recruiter-pro', 'bulk-outreach'] });
}

/** GET /bulk-outreach/campaigns — campaign list (21.06). */
export function useBulkOutreachCampaigns() {
  return useQuery({
    queryKey: ['recruiter-pro', 'bulk-outreach'],
    queryFn: async () => {
      const { data } = await api.get<{ data: BulkOutreachCampaign[] }>('/bulk-outreach');
      return data.data;
    },
  });
}

export type CreateCampaignBody = {
  name: string;
  channel: OutreachChannel;
  audience_count: number;
  variants: Array<Pick<BulkOutreachVariant, 'label' | 'template_id' | 'subject' | 'body' | 'split_pct'>>;
  scheduled_at: string | null;
};

export function useCreateBulkOutreachCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateCampaignBody) => {
      const { data } = await api.post<{ data: BulkOutreachCampaign }>('/bulk-outreach', body);
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useSendBulkOutreachCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ data: BulkOutreachCampaign }>(`/bulk-outreach/campaigns/${id}/send`);
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}
