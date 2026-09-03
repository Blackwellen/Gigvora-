'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  User,
  Settings,
  Shield,
  Bell,
  Bookmark,
  LogOut,
  Keyboard,
  CreditCard,
  ShieldCheck,
  Building2,
  Loader2,
  History,
  LifeBuoy,
  BarChart3,
  Users,
  DollarSign,
  Briefcase,
  LayoutGrid,
} from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent, usePopoverClose } from '@/components/ui/Popover';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { useSession } from '@/lib/session/SessionContext';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';
import { api, getApiErrorMessage } from '@/lib/api';
import { useEntitlements } from '@/hooks/useEntitlements';

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  professional: 'Professional',
  business: 'Business',
  recruiter: 'Recruiter',
  recruiter_pro: 'Recruiter Pro',
  sales_navigator: 'Sales Navigator',
  enterprise: 'Enterprise',
  unlimited: 'Unlimited',
};

export function UserMenu() {
  const { user, logout } = useSession();

  if (!user) return <div className="h-9 w-9 animate-pulse rounded-full bg-ink-100 dark:bg-ink-800" />;

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');

  return (
    <Popover>
      <PopoverTrigger>
        <button type="button" className="rounded-full ring-offset-2 focus-visible:ring-2 focus-visible:ring-brand-500">
          <Avatar src={user.avatarUrl} name={fullName} size="sm" online />
        </button>
      </PopoverTrigger>
      <PopoverContent width="w-80">
        <UserMenuBody fullName={fullName} email={user.email} logout={logout} />
      </PopoverContent>
    </Popover>
  );
}

function UserMenuBody({ fullName, email, logout }: { fullName: string; email: string; logout: () => void }) {
  const close = usePopoverClose();
  const { active, contexts, switchWorkspace } = useWorkspace();
  const { user } = useSession();
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);

  // Shared with the Sales Navigator / Enterprise Connect top-bar widgets via
  // the useEntitlements hook (apps/web/src/hooks/useEntitlements.ts) so the
  // menu, the widgets and any other consumer all read one cached request
  // instead of firing duplicate GET /users/me/entitlements calls.
  const { data: entitlements } = useEntitlements();

  async function handleManageBilling() {
    setBillingError(null);
    setBillingLoading(true);
    try {
      // Matches the checkout/portal-session pattern already used by the
      // pricing & recruiter-pro upgrade CTAs (apps/api/src/modules/billing).
      const { data } = await api.post<{ data: { url: string } }>('/billing/portal-session', {
        returnUrl: typeof window !== 'undefined' ? window.location.href : undefined,
      });
      window.location.href = data.data.url;
    } catch (err) {
      setBillingError(getApiErrorMessage(err, 'Could not open billing portal.'));
      setBillingLoading(false);
    }
  }

  // "Switch to [Business]" quick action — surfaces the account's first
  // administered organisation (owner/admin role) that isn't already active.
  // Skipped entirely (rather than fabricated) when the account has no
  // organisations to administer.
  const switchableOrg = contexts?.organizations?.find(
    (o) => (o.role === 'owner' || o.role === 'admin') && o.id !== (active && 'id' in active ? active.id : undefined)
  );

  const planKey = entitlements?.planKey;
  const isPaidPlan = Boolean(planKey && planKey !== 'free');

  // Same audience rule the "Analytics" mega-menu item used to carry
  // (audience: ['recruiter', 'company', 'organization'] in
  // apps/api/src/db/seeds/05_navigation.js, enforced server-side via
  // navigation.service.js#audienceAllows): visible for recruiter/company
  // account types, or for anyone acting inside an organisation workspace.
  const isRecruiterOrCompanyOrOrg = user?.account_type === 'recruiter' || user?.account_type === 'company' || active?.type === 'organization';

  // The old "More" mega menu's Workspace section (Talent/Clients/Finance/
  // Admin) was audience: ['organization'] — only shown while an org
  // workspace is active. WorkspaceSwitcher/UserMenu already determine that
  // the same way: active.type === 'organization'.
  const isOrgWorkspace = active?.type === 'organization';

  return (
    <div>
      <div className="flex items-center gap-3 border-b border-ink-100 dark:border-ink-800 px-3 pb-3 pt-1">
        <Avatar src={user?.avatarUrl} name={fullName} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate font-display text-sm font-bold tracking-[-0.01em] text-ink-900 dark:text-white">{fullName}</p>
            {entitlements && (
              <Badge tone={isPaidPlan ? 'brand' : 'neutral'}>
                {isPaidPlan ? (PLAN_LABELS[planKey!] || planKey) : 'Free · Upgrade'}
              </Badge>
            )}
          </div>
          <p className="truncate text-xs text-ink-500 dark:text-ink-400">{email}</p>
          {active && (
            <Badge tone="neutral" className="mt-1">
              {active.type === 'organization' ? active.name : 'Personal account'}
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-0.5 py-2">
        <MenuLink href={`/profile/${user?.id}`} icon={User} label="View profile" onClick={close} />
        <MenuLink href="/app/projects-home" icon={LayoutGrid} label="My Projects" onClick={close} />
        <MenuLink href="/app/saved-items" icon={Bookmark} label="Saved items" onClick={close} />
        {/* Folded in from the "More" mega menu's Tools section. */}
        <MenuLink href="/app/recent-activity" icon={History} label="Recent Activity" onClick={close} />
        <MenuLink href="/app/notifications-tray" icon={Bell} label="Notification preferences" onClick={close} />
        <MenuLink href="/settings/security" icon={Shield} label="Security" onClick={close} />
        <MenuLink href="/settings" icon={Settings} label="Settings" onClick={close} />
        {/* Folded in from the "More" mega menu's Account section. */}
        <MenuLink href="/support" icon={LifeBuoy} label="Help &amp; Support" onClick={close} />
        {/* Same destination the "More" mega menu's "Navigation Settings" link
            used — kept as one entry, not duplicated. */}
        <MenuLink href="/app/primary-navigation" icon={Keyboard} label="Keyboard shortcuts &amp; nav" onClick={close} />

        {isRecruiterOrCompanyOrOrg && (
          // Folded in from the removed "Analytics" top-level nav item, same
          // audience rule (recruiter/company account types, or an active
          // organisation workspace) and same destination.
          <MenuLink href="/app/analytics" icon={BarChart3} label="Analytics" onClick={close} />
        )}

        <button
          type="button"
          onClick={handleManageBilling}
          disabled={billingLoading}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-ink-700 transition-colors duration-150 ease-out dark:text-ink-200 hover:bg-ink-50 dark:hover:bg-ink-800 disabled:opacity-60"
        >
          {billingLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-ink-400 dark:text-ink-500" />
          ) : (
            <CreditCard className="h-4 w-4 text-ink-400 dark:text-ink-500" />
          )}
          Billing &amp; Subscription
        </button>
        {billingError && <p className="px-3 text-xs text-red-600">{billingError}</p>}

        {user?.role === 'admin' && (
          // No dedicated platform-level admin dashboard route exists yet —
          // /app/admin is the closest real destination (workspace admin
          // tools) until a platform admin surface ships.
          <MenuLink href="/app/admin" icon={ShieldCheck} label="Admin dashboard" onClick={close} />
        )}

        {switchableOrg && (
          <button
            type="button"
            onClick={async () => {
              await switchWorkspace(switchableOrg.id);
              close();
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-ink-700 transition-colors duration-150 ease-out dark:text-ink-200 hover:bg-ink-50 dark:hover:bg-ink-800"
          >
            <Building2 className="h-4 w-4 text-ink-400 dark:text-ink-500" />
            <span className="truncate">Switch to {switchableOrg.name}</span>
          </button>
        )}
      </div>

      {isOrgWorkspace && (
        // Folded in from the removed "More" mega menu's org-only Workspace
        // section (audience: ['organization']) — same real routes the nav
        // items pointed at, shown with the same active.type === 'organization'
        // check WorkspaceSwitcher/UserMenu already use elsewhere in this file.
        <div className="border-t border-ink-100 py-2 dark:border-ink-800">
          <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-ink-400 dark:text-ink-500">Workspace</p>
          <div className="space-y-0.5">
            <MenuLink href="/app/talent" icon={Users} label="Talent" onClick={close} />
            <MenuLink href="/app/clients" icon={Briefcase} label="Clients" onClick={close} />
            <MenuLink href="/app/finance" icon={DollarSign} label="Finance" onClick={close} />
            {/* Distinct label from "Admin dashboard" above (both route to
                /app/admin) so the two audience-gated entries never read as
                a literal duplicate when both are visible at once. */}
            <MenuLink href="/app/admin" icon={Settings} label="Workspace administration" onClick={close} />
          </div>
        </div>
      )}

      <div className="border-t border-ink-100 pt-2">
        <button
          type="button"
          onClick={() => {
            close();
            logout();
          }}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );
}

function MenuLink({
  href,
  icon: Icon,
  label,
  onClick,
}: {
  href: string;
  icon: typeof User;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-700 transition-colors duration-150 ease-out dark:text-ink-200 hover:bg-ink-50 dark:hover:bg-ink-800">
      <Icon className="h-4 w-4 text-ink-400 dark:text-ink-500" /> {label}
    </Link>
  );
}
