'use client';

import { createContext, useContext } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api, clearSession } from '@/lib/api';

export type CurrentUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  headline: string | null;
  account_type: 'individual' | 'recruiter' | 'company';
  role: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  location: string | null;
  industry: string | null;
  openToWork: boolean;
  connectionCount: number;
  followerCount: number;
  followingCount: number;
};

type SessionCtx = {
  user: CurrentUser | undefined;
  isLoading: boolean;
  isError: boolean;
  logout: () => void;
};

const Ctx = createContext<SessionCtx | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await api.get<{ data: CurrentUser }>('/users/me');
      return data.data;
    },
    retry: false,
  });

  function logout() {
    clearSession();
    queryClient.clear();
    router.push('/sign-in');
  }

  return <Ctx.Provider value={{ user: data, isLoading, isError, logout }}>{children}</Ctx.Provider>;
}

export function useSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
