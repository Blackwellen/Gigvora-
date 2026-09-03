'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type PersonalContext = {
  id: 'personal';
  type: 'personal';
  name: string;
  email: string;
  headline: string | null;
  hasProfessionalProfile: boolean;
};

export type OrganizationContext = {
  id: string;
  type: 'organization';
  name: string;
  slug: string;
  logoUrl: string | null;
  orgType: string;
  plan: string;
  role: 'owner' | 'admin' | 'recruiter' | 'member' | 'viewer';
  isStarred: boolean;
  lastActiveAt: string | null;
  joinedAt: string;
  pendingActions: number;
  unread: number;
};

export type AccountContexts = { personal: PersonalContext; organizations: OrganizationContext[] };

type WorkspaceCtx = {
  contexts: AccountContexts | undefined;
  isLoading: boolean;
  active: PersonalContext | OrganizationContext | undefined;
  activeWorkspaceId: string; // 'personal' or a company id
  switchWorkspace: (id: string) => Promise<void>;
  starWorkspace: (companyId: string, starred: boolean) => Promise<void>;
};

const Ctx = createContext<WorkspaceCtx | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('personal');

  useEffect(() => {
    setActiveWorkspaceId(localStorage.getItem('activeWorkspaceId') || 'personal');
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['account-contexts'],
    queryFn: async () => {
      const { data } = await api.get<{ data: AccountContexts }>('/account-contexts');
      return data.data;
    },
    retry: false,
  });

  const active =
    activeWorkspaceId === 'personal'
      ? data?.personal
      : data?.organizations.find((o) => o.id === activeWorkspaceId);

  async function switchWorkspace(id: string) {
    await api.post('/account-contexts/switch', { companyId: id === 'personal' ? null : id });
    localStorage.setItem('activeWorkspaceId', id);
    setActiveWorkspaceId(id);
    // Server-scoped data (nav, feed, saved items, activity) all key off the
    // active workspace header — invalidate everything so nothing from the
    // previous context lingers in view.
    await queryClient.invalidateQueries();
  }

  async function starWorkspace(companyId: string, starred: boolean) {
    await api.post(`/account-contexts/${companyId}/star`, { isStarred: starred });
    await queryClient.invalidateQueries({ queryKey: ['account-contexts'] });
  }

  return (
    <Ctx.Provider value={{ contexts: data, isLoading, active, activeWorkspaceId, switchWorkspace, starWorkspace }}>
      {children}
    </Ctx.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}
