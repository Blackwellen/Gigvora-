'use client';

// Backed by GET /api/v1/users/me/entitlements — apps/api/src/modules/billing.
// Single shared query so every consumer (UserMenu's plan badge, the
// Sales Navigator / Enterprise Connect top-bar widgets, any future
// feature-gated surface) reads the same cached result instead of firing
// duplicate requests. Fetch defensively: a 404 (not deployed in some
// environment) or any other failure should just mean "no entitlements
// known yet", not a crash of the shell.

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type Entitlements = { planKey: string; status: string; features: string[] };

export const ENTITLEMENTS_QUERY_KEY = ['me', 'entitlements'] as const;

export function useEntitlements() {
  return useQuery({
    queryKey: ENTITLEMENTS_QUERY_KEY,
    queryFn: async () => {
      const { data } = await api.get<{ data: Entitlements }>('/users/me/entitlements');
      return data.data;
    },
    retry: false,
    throwOnError: false,
  });
}

/** True when `features` includes `featureKey` or the '*' wildcard (mirrors apps/api/src/modules/billing/entitlements.js#hasFeature). */
export function hasFeature(features: string[] | undefined, featureKey: string): boolean {
  if (!Array.isArray(features)) return false;
  return features.includes('*') || features.includes(featureKey);
}

/** Convenience hook for a single feature gate — returns `undefined` while loading, `true`/`false` once resolved. */
export function useHasFeature(featureKey: string): boolean | undefined {
  const { data, isLoading } = useEntitlements();
  if (isLoading) return undefined;
  return hasFeature(data?.features, featureKey);
}
