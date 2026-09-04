'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PmProjectBrief, PmPublicProject } from './types';

export type MarketplaceFilters = {
  category?: string;
  countryCode?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

type PagedResponse<T> = { data: T[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } };

/**
 * Browse projects open to bids (GET /pm-projects/marketplace) — requires
 * only auth, not project membership. Backs the "Browse Projects" page
 * (apps/web/src/app/app/(workspace)/project-search/page.tsx).
 */
export function useMarketplaceProjects(filters: MarketplaceFilters) {
  return useQuery({
    queryKey: ['pm-projects', 'marketplace', filters],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<PmPublicProject>>('/pm-projects/marketplace', { params: filters });
      return data;
    },
  });
}

/**
 * Single-project brief (GET /pm-projects/:id/brief) — works for non-members
 * viewing an open-to-bids project as well as existing members (who get the
 * full project shape back with isMember: true). See useProject() for the
 * membership-required full-detail equivalent.
 */
export function useProjectBrief(projectId: string | undefined) {
  return useQuery({
    queryKey: ['pm-projects', 'brief', projectId],
    queryFn: async () => {
      const { data } = await api.get<{ data: PmProjectBrief }>(`/pm-projects/${projectId}/brief`);
      return data.data;
    },
    enabled: Boolean(projectId),
    retry: 1,
  });
}
