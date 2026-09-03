'use client';

import Link from 'next/link';
import { ShieldCheck, Building2, Plug, Users } from 'lucide-react';
import { usePopoverClose } from '@/components/ui/Popover';
import { useHasFeature } from '@/hooks/useEntitlements';
import { WidgetDropdown } from './WidgetDropdown';

// Enterprise Connect, like Sales Navigator, is a marketing/preview surface
// today — /app/enterprise-connect has no deep functionality behind it yet,
// so this widget is quick access + a glance of what's available, not real
// live data. Only renders for accounts entitled to the 'enterprise_connect'
// feature (or the '*' wildcard), same gating the removed mega-menu item
// enforced server-side. No locked/upsell state otherwise — it just doesn't
// render, matching the mega-menu item's prior behaviour.
const QUICK_LINKS = [
  { key: 'org-directory', label: 'Organisation Directory', href: '/app/enterprise-connect?tab=directory', icon: Building2 },
  { key: 'integrations', label: 'Integrations', href: '/app/enterprise-connect?tab=integrations', icon: Plug },
  { key: 'sso-teams', label: 'SSO & Teams', href: '/app/enterprise-connect?tab=teams', icon: Users },
];

export function EnterpriseConnectWidget() {
  const hasFeature = useHasFeature('enterprise_connect');
  if (!hasFeature) return null;

  return (
    <WidgetDropdown
      label="Enterprise Connect"
      icon={ShieldCheck}
      title="Enterprise Connect"
      viewAllHref="/app/enterprise-connect"
      width="w-80"
      dataTourAnchor="enterprise-connect"
    >
      <div className="space-y-3 p-1">
        <p className="px-1.5 text-xs text-ink-500 dark:text-ink-400">
          Connect your organisation, manage integrations and single sign-on.
        </p>
        <ul className="space-y-0.5">
          {QUICK_LINKS.map(({ key, ...link }) => (
            <QuickLinkRow key={key} {...link} />
          ))}
        </ul>
      </div>
    </WidgetDropdown>
  );
}

function QuickLinkRow({ label, href, icon: Icon }: { label: string; href: string; icon: typeof Building2 }) {
  const close = usePopoverClose();
  return (
    <li>
      <Link
        href={href}
        onClick={close}
        className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-ink-800"
      >
        <Icon className="h-4 w-4 text-ink-400 dark:text-ink-500" /> {label}
      </Link>
    </li>
  );
}
