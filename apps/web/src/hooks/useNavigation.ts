'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';

export type NavNode = {
  id: string;
  key: string;
  itemType: 'top_level' | 'section' | 'link' | 'quick_action';
  navGroup: string | null;
  label: string;
  description: string | null;
  route: string | null;
  iconKey: string | null;
  supportsMegaMenu: boolean;
  orderIndex: number;
  metadata: Record<string, unknown>;
  children: NavNode[];
};

export function useNavigationTree() {
  const { activeWorkspaceId } = useWorkspace();
  return useQuery({
    queryKey: ['navigation', activeWorkspaceId],
    queryFn: async () => {
      const { data } = await api.get<{ data: NavNode[] }>('/navigation');
      return data.data;
    },
  });
}

export type NavPreferences = {
  pinned_item_keys: string[];
  hidden_item_keys: string[];
  custom_order: string[];
  menu_density: 'comfortable' | 'compact';
  show_icons: boolean;
  personalisation_enabled: boolean;
};

export function useNavigationPreferences() {
  const { activeWorkspaceId } = useWorkspace();
  return useQuery({
    queryKey: ['navigation-preferences', activeWorkspaceId],
    queryFn: async () => {
      const { data } = await api.get<{ data: NavPreferences }>('/navigation/preferences');
      return data.data;
    },
  });
}
