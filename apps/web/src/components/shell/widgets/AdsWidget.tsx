'use client';

import Link from 'next/link';
import { Megaphone, Plus, LayoutList, LayoutDashboard } from 'lucide-react';
import { usePopoverClose } from '@/components/ui/Popover';
import { useAdAccount } from '@/hooks/useAds';
import { WidgetDropdown } from './WidgetDropdown';

// Gigvora Ads — a real self-serve ad platform for promoting the advertiser's
// own existing posts/jobs/company pages (apps/api/src/modules/ads). Unlike
// Sales Navigator, this is NOT entitlement-gated: every account can create
// and run ad campaigns, so this widget always renders.
const QUICK_LINKS = [
  { key: 'create', label: 'Create campaign', href: '/app/gigvora-ads/campaigns/new', icon: Plus },
  { key: 'campaigns', label: 'My campaigns', href: '/app/gigvora-ads/campaigns', icon: LayoutList },
  { key: 'dashboard', label: 'Ads dashboard', href: '/app/gigvora-ads', icon: LayoutDashboard },
];

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

export function AdsWidget() {
  const { data, isLoading } = useAdAccount();
  const activeCount = data?.campaignCounts?.active ?? 0;
  const spentThisMonth = currency.format((data?.spendThisMonthCents ?? 0) / 100);

  return (
    <WidgetDropdown
      label="Gigvora Ads"
      icon={Megaphone}
      title="Gigvora Ads"
      viewAllHref="/app/gigvora-ads"
      viewAllLabel="Ads dashboard"
      width="w-80"
      dataTourAnchor="gigvora-ads"
    >
      <div className="space-y-3 p-1">
        <p className="px-1.5 text-xs text-ink-500 dark:text-ink-400">
          {isLoading
            ? 'Loading your ad account…'
            : `${activeCount} active campaign${activeCount === 1 ? '' : 's'} · ${spentThisMonth} spent this month`}
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

function QuickLinkRow({ label, href, icon: Icon }: { label: string; href: string; icon: typeof Plus }) {
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
