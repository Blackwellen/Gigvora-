'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type OpportunityMatches = {
  jobs: Array<Record<string, unknown>>;
  people: Array<Record<string, unknown>>;
};

/**
 * Backs the onboarding "Opportunity matches" right-rail card via the real
 * GET /search/recommendations endpoint (apps/api/src/modules/search/search.routes.js),
 * which proxies apps/ml-service's /recommendations/:userId.
 *
 * NOTE (gap to flag, not fabricate around): as of this build,
 * apps/ml-service/app/services/matching_service.py's get_recommendations() is a
 * placeholder that unconditionally returns { jobs: [], people: [] } — there is no
 * trained recommender behind this yet. The card below renders whatever this
 * endpoint returns and shows an honest "not enough data yet" empty state when it's
 * empty, so it will start showing real matches automatically once that model is
 * implemented — nothing here is mocked or hardcoded to appear populated.
 */
export function useOpportunityMatches() {
  return useQuery({
    queryKey: ['onboarding-opportunity-matches'],
    queryFn: async () => {
      const { data } = await api.get<{ data: OpportunityMatches }>('/search/recommendations');
      return data.data;
    },
    staleTime: 60 * 1000,
  });
}
