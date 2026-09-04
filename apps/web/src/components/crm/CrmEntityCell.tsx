'use client';

import { Building2 } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/cn';

/**
 * Reusable rich table cell, generalized from the applicants page's
 * person-cell pattern. `type="person"` renders an avatar + name + subtitle
 * (job title / account name); `type="company"` renders a logo-or-icon tile +
 * name + domain. Used across Contacts/Leads (person) and Accounts (company)
 * DataTable columns, and inside PipelineCard for the primary contact / owner.
 */
export function CrmEntityCell({
  type = 'person',
  avatarUrl,
  title,
  subtitle,
  size = 'sm',
  className,
}: {
  type?: 'person' | 'company';
  avatarUrl?: string | null;
  title: string;
  subtitle?: string | null;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
      {type === 'person' ? (
        <Avatar name={title || '?'} src={avatarUrl} size={size} />
      ) : avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={title}
          className={cn('shrink-0 rounded-lg object-cover ring-1 ring-black/5', size === 'xs' ? 'h-6 w-6' : size === 'md' ? 'h-10 w-10' : 'h-8 w-8')}
        />
      ) : (
        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-400 dark:bg-ink-800 dark:text-ink-500',
            size === 'xs' ? 'h-6 w-6' : size === 'md' ? 'h-10 w-10' : 'h-8 w-8'
          )}
        >
          <Building2 className={size === 'xs' ? 'h-3 w-3' : 'h-4 w-4'} />
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate font-semibold text-ink-900 dark:text-white">{title || '—'}</p>
        {subtitle && <p className="truncate text-xs text-ink-400 dark:text-ink-500">{subtitle}</p>}
      </div>
    </div>
  );
}
