'use client';

import Link from 'next/link';
import { Target, Search, Bookmark, GitBranch } from 'lucide-react';
import { usePopoverClose } from '@/components/ui/Popover';
import { useHasFeature } from '@/hooks/useEntitlements';
import { WidgetDropdown } from './WidgetDropdown';

// Sales Navigator today is a marketing/preview surface — /app/sales-navigator
// has no deep functionality behind it yet, so this widget's job is quick
// access + a glance of what's available, not real live data. It only
// renders at all for accounts entitled to the 'sales_navigator' feature (or
// the '*' wildcard) — same gating the old mega-menu item enforced
// server-side (apps/api/src/db/seeds/05_navigation.js /
// navigation.service.js#requiredFeatureAllows), now checked client-side via
// the shared useEntitlements hook. No locked/upsell state for accounts that
// lack the feature — the widget simply doesn't render, matching how the
// mega-menu item behaved.
const QUICK_LINKS = [
  { key: 'lead-search', label: 'Lead Search', href: '/app/sales-navigator?tab=lead-search', icon: Search },
  { key: 'saved-leads', label: 'Saved Leads', href: '/app/sales-navigator?tab=saved-leads', icon: Bookmark },
  { key: 'pipeline', label: 'Pipeline', href: '/app/sales-navigator?tab=pipeline', icon: GitBranch },
];

export function SalesNavigatorWidget() {
  const hasFeature = useHasFeature('sales_navigator');
  if (!hasFeature) return null;

  return (
    <WidgetDropdown
      label="Sales Navigator"
      icon={Target}
      title="Sales Navigator"
      viewAllHref="/app/sales-navigator"
      width="w-80"
      dataTourAnchor="sales-navigator"
    >
      <div className="space-y-3 p-1">
        <p className="px-1.5 text-xs text-ink-500 dark:text-ink-400">
          Find leads, track accounts and build your pipeline.
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

function QuickLinkRow({ label, href, icon: Icon }: { label: string; href: string; icon: typeof Search }) {
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
