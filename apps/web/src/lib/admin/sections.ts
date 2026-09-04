import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  LifeBuoy,
  Wallet,
  ServerCog,
  KeyRound,
  BrainCircuit,
  type LucideIcon,
} from 'lucide-react';

export type AdminSectionKey = 'overview' | 'users' | 'moderation' | 'support' | 'finance' | 'system' | 'intelligence' | 'roles';

export type AdminSectionMeta = {
  key: AdminSectionKey;
  label: string;
  route: string;
  icon: LucideIcon;
  description: string;
};

// Single source of truth for label/icon/route/description per section. Authorization is NOT
// decided here — the API's `GET /admin/context` returns the `sections` array a given role may
// see, and the sidebar/pages only render entries present in that list. This map is presentation
// metadata only.
export const ADMIN_SECTIONS: Record<AdminSectionKey, AdminSectionMeta> = {
  overview: {
    key: 'overview',
    label: 'Overview',
    route: '/admin',
    icon: LayoutDashboard,
    description: 'A snapshot of platform health, your role, and what you can access here.',
  },
  users: {
    key: 'users',
    label: 'Users',
    route: '/admin/users',
    icon: Users,
    description: 'Search, review and manage member accounts across the platform.',
  },
  moderation: {
    key: 'moderation',
    label: 'Moderation',
    route: '/admin/moderation',
    icon: ShieldAlert,
    description: 'Review reported content, enforce policy, and manage the moderation queue.',
  },
  support: {
    key: 'support',
    label: 'Support',
    route: '/admin/support',
    icon: LifeBuoy,
    description: 'Handle customer support tickets and escalations.',
  },
  finance: {
    key: 'finance',
    label: 'Finance',
    route: '/admin/finance',
    icon: Wallet,
    description: 'Track platform revenue, payouts, and billing operations.',
  },
  system: {
    key: 'system',
    label: 'System',
    route: '/admin/system',
    icon: ServerCog,
    description: 'Monitor platform infrastructure, feature flags, and operational health.',
  },
  intelligence: {
    key: 'intelligence',
    label: 'Intelligence',
    route: '/admin/intelligence',
    icon: BrainCircuit,
    description: 'Manage the models behind matching, ranking, recommendations, parsing, scoring and fraud detection.',
  },
  roles: {
    key: 'roles',
    label: 'Roles & Permissions',
    route: '/admin/roles',
    icon: KeyRound,
    description: 'Manage which platform staff hold which roles and what each role can access.',
  },
};

export const ADMIN_SECTION_ORDER: AdminSectionKey[] = ['overview', 'users', 'moderation', 'support', 'finance', 'system', 'intelligence', 'roles'];

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  moderator: 'Moderator',
  customer_service: 'Customer Service',
  finance: 'Finance',
};
