import { createContext, useContext, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, clearSession, getStoredTokens, storeSession } from './apiClient';
import { setHasOnboarded } from './onboarding';

export type CurrentUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  headline: string | null;
  account_type: string;
  avatarUrl: string | null;
  connectionCount: number;
  followerCount: number;
  followingCount: number;
};

type SessionCtx = {
  user: CurrentUser | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (tokens: { accessToken: string; refreshToken: string }) => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<SessionCtx | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  useEffect(() => {
    getStoredTokens().then(({ accessToken }) => setHasToken(Boolean(accessToken)));
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get<{ data: CurrentUser }>('/users/me')).data.data,
    enabled: hasToken === true,
    retry: false,
  });

  useEffect(() => {
    if (hasToken === true && isError) setHasToken(false);
  }, [hasToken, isError]);

  async function login(tokens: { accessToken: string; refreshToken: string }) {
    await storeSession(tokens);
    await setHasOnboarded();
    setHasToken(true);
    await queryClient.invalidateQueries({ queryKey: ['me'] });
  }

  async function logout() {
    await clearSession();
    queryClient.clear();
    setHasToken(false);
  }

  const isAuthenticated = hasToken === true && Boolean(data) && !isError;

  return (
    <Ctx.Provider
      value={{
        user: data,
        isLoading: hasToken === null || (hasToken === true && isLoading),
        isAuthenticated,
        login,
        logout,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
