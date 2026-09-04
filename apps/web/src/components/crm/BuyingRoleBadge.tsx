'use client';

import { Badge } from '@/components/ui/Badge';
import type { CrmBuyingRole } from '@/hooks/crm/types';

const ROLE_CONFIG: Record<CrmBuyingRole, { label: string; tone: 'brand' | 'success' | 'warning' | 'danger' | 'neutral' }> = {
  champion: { label: 'Champion', tone: 'success' },
  decision_maker: { label: 'Decision Maker', tone: 'brand' },
  influencer: { label: 'Influencer', tone: 'brand' },
  user: { label: 'User', tone: 'neutral' },
  procurement: { label: 'Procurement', tone: 'warning' },
  blocker: { label: 'Blocker', tone: 'danger' },
};

/** Badge for crm_account_contact_roles.buying_role — used in the Buying Group / stakeholder map UI. */
export function BuyingRoleBadge({ role }: { role: CrmBuyingRole | null | undefined }) {
  if (!role) return null;
  const config = ROLE_CONFIG[role];
  if (!config) return <Badge tone="neutral">{role}</Badge>;
  return <Badge tone={config.tone}>{config.label}</Badge>;
}
