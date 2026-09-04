'use client';

import Link from 'next/link';
import { cn } from '@/lib/cn';

export type CrmNavKey =
  | 'home'
  | 'contacts'
  | 'leads'
  | 'accounts'
  | 'opportunities'
  | 'pipeline'
  | 'segments'
  | 'followups'
  | 'savedViews'
  | 'duplicates'
  | 'imports'
  | 'analytics';

const NAV_CONFIG: Array<{ key: CrmNavKey; label: string; href: string }> = [
  { key: 'home', label: 'Overview', href: '/app/crm-home' },
  { key: 'contacts', label: 'Contacts', href: '/app/crm-contacts' },
  { key: 'leads', label: 'Leads', href: '/app/crm-leads' },
  { key: 'accounts', label: 'Accounts', href: '/app/crm-accounts' },
  { key: 'opportunities', label: 'Opportunities', href: '/app/crm-opportunities' },
  { key: 'pipeline', label: 'Pipeline', href: '/app/crm-pipeline' },
  { key: 'segments', label: 'Segments', href: '/app/crm-segments' },
  { key: 'followups', label: 'Follow-Ups', href: '/app/crm-followups' },
  { key: 'savedViews', label: 'Saved Views', href: '/app/crm-saved-views' },
  { key: 'duplicates', label: 'Enrichment Queue', href: '/app/crm-duplicates' },
  { key: 'imports', label: 'Imports', href: '/app/crm-imports' },
  { key: 'analytics', label: 'Analytics', href: '/app/crm-analytics' },
];

/**
 * Lightweight cross-navigation strip for Domain 24 (CRM). Route-based like
 * ProjectTabs (each entry is a distinct page), styled to match its active
 * state exactly: brand-700 text + a 2px brand-600 underline bar. Drop this
 * below the page header on any of the 15 CRM routes so users can hop between
 * Contacts/Leads/Accounts/Opportunities/Pipeline/Segments/Follow-Ups/etc.
 * without going back through a parent nav.
 */
export function CrmLocalNav({ active, counts = {} }: { active: CrmNavKey; counts?: Partial<Record<CrmNavKey, number>> }) {
  return (
    <div role="tablist" aria-label="CRM sections" className="flex items-center gap-1 overflow-x-auto border-b border-ink-100 dark:border-ink-800">
      {NAV_CONFIG.map((item) => {
        const isActive = item.key === active;
        const count = counts[item.key];
        return (
          <Link
            key={item.key}
            href={item.href}
            role="tab"
            aria-selected={isActive}
            className={cn(
              'relative flex shrink-0 items-center gap-1 whitespace-nowrap px-3.5 py-2.5 font-display text-sm font-semibold tracking-[-0.01em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
              isActive ? 'text-brand-700 dark:text-brand-400' : 'text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-100'
            )}
          >
            {item.label}
            {typeof count === 'number' && <span className="ml-1 text-xs font-bold text-ink-400 dark:text-ink-500">{count}</span>}
            {isActive && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-600" />}
          </Link>
        );
      })}
    </div>
  );
}
