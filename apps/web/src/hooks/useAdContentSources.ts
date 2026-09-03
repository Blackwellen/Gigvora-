'use client';

// Read-only content-picker sources for the Gigvora Ads "create campaign"
// wizard. There is no dedicated "my jobs" or "my companies" backend endpoint
// yet, so these hit the existing real list endpoints and filter client-side
// to what the current user actually owns — the same ownership rule the ads
// backend itself enforces server-side (apps/api/.../ads/adCampaigns.service.js
// assertOwnsContent), so nothing shown here can 403 when picked.

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session/SessionContext';

export type MyJobOption = {
  id: string;
  title: string;
  status: string;
  location: string | null;
  employmentType: string | null;
};

/** GET /jobs is a public, unfiltered list (no "mine" query param on the backend) —
 * fetched with a generous limit and filtered client-side to jobs.posted_by === me. */
export function useMyPostedJobsForAds() {
  const { user } = useSession();
  return useQuery({
    queryKey: ['ads-content-source-jobs', user?.id],
    queryFn: async () => {
      const { data } = await api.get<{ data: Array<Record<string, unknown>> }>('/jobs', { params: { limit: 200 } });
      const rows = data.data ?? [];
      return rows
        .filter((row) => row.posted_by === user?.id)
        .map(
          (row): MyJobOption => ({
            id: String(row.id),
            title: String(row.title ?? 'Untitled job'),
            status: String(row.status ?? 'open'),
            location: (row.location as string | null) ?? null,
            employmentType: (row.employment_type as string | null) ?? null,
          })
        );
    },
    enabled: Boolean(user?.id),
    staleTime: 30_000,
  });
}

export type MyCompanyOption = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  role: string;
};

/** GET /account-contexts (useWorkspace's own query) already lists every company the
 * user actively belongs to with their role — filtered here to owner/admin, matching
 * the ads backend's own ownership check for company_awareness campaigns. */
export function useMyOwnedCompaniesForAds() {
  return useQuery({
    queryKey: ['ads-content-source-companies'],
    queryFn: async () => {
      const { data } = await api.get<{
        data: { organizations: Array<{ id: string; name: string; slug: string; logoUrl: string | null; role: string }> };
      }>('/account-contexts');
      return data.data.organizations
        .filter((org) => org.role === 'owner' || org.role === 'admin')
        .map((org) => ({ id: org.id, name: org.name, slug: org.slug, logoUrl: org.logoUrl, role: org.role }));
    },
    staleTime: 30_000,
  });
}
