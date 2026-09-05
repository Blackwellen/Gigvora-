'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Application, ApplicationStatus } from './types';

// Backed by GET /applications/mine — the applicant-facing counterpart to the
// job-owner-scoped list at GET /applications (see useJobApplicants.ts). Returns the
// current user's own submitted applications, newest first, with job title/company
// enrichments joined server-side.
export type MyApplication = Application & {
  job_title?: string | null;
  job_location?: string | null;
  job_employment_type?: string | null;
  job_work_mode?: string | null;
  job_status?: string | null;
  company_id?: string | null;
  company_name?: string | null;
  company_logo_url?: string | null;
};

export function useMyApplications(status?: ApplicationStatus, limit = 20) {
  return useQuery({
    queryKey: ['applications', 'mine', status, limit],
    queryFn: async () => {
      const { data } = await api.get<{ data: MyApplication[]; meta: { total: number } }>('/applications/mine', {
        params: { status, limit },
      });
      return data;
    },
  });
}
