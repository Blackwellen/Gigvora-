'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { api, getApiErrorMessage } from '@/lib/api';
import type { AdminSectionKey } from './sections';

export type AdminContextData = {
  role: string;
  sections: AdminSectionKey[];
};

type AdminCtxValue = {
  data: AdminContextData | undefined;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
};

const Ctx = createContext<AdminCtxValue | null>(null);

/**
 * Fetches `GET /admin/context` once on mount and shares the result (role + the sections this
 * role is allowed to see) with the whole admin dashboard tree. Deliberately plain fetch/useState
 * rather than react-query — the admin shell is a separate route tree from `/app` and doesn't pull
 * in `QueryProvider`, and a single request on mount doesn't need caching/invalidation machinery.
 */
export function AdminContextProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AdminContextData | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await api.get<{ data: AdminContextData }>('/admin/context');
        if (!cancelled) {
          setData(res.data.data);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setIsError(true);
          setErrorMessage(getApiErrorMessage(err, 'You do not have access to the admin dashboard.'));
          setIsLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return <Ctx.Provider value={{ data, isLoading, isError, errorMessage }}>{children}</Ctx.Provider>;
}

export function useAdminContext() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAdminContext must be used within AdminContextProvider');
  return ctx;
}
