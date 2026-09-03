'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent, usePopoverClose } from '@/components/ui/Popover';
import { CountBadge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';

/**
 * Shared chrome for every top-bar widget dropdown (notifications, network,
 * videos, tasks, calendar, creation studio). Built once on top of the
 * existing Popover primitive so positioning, click-outside, Escape-to-close
 * and animation stay consistent app-wide, and so each widget's Popover state
 * is independent — opening one never closes another.
 *
 * Every widget gets two escape hatches out of the compact dropdown, per
 * spec: an inline "expand" toggle that grows the dropdown itself (more
 * rows, taller panel, no navigation), and a "View all" link that leaves the
 * dropdown for the full dedicated page.
 */
export function WidgetDropdown({
  label,
  icon: Icon,
  count,
  title,
  viewAllHref,
  viewAllLabel = 'View all',
  width = 'w-96',
  expandedWidth,
  children,
  headerAction,
  dataTourAnchor,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  title: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  width?: string;
  expandedWidth?: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
  dataTourAnchor?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Popover onOpenChange={(open) => !open && setExpanded(false)}>
      <PopoverTrigger>
        <button
          type="button"
          aria-label={label}
          data-tour-anchor={dataTourAnchor}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800"
        >
          <Icon className="h-4.5 w-4.5" />
          {typeof count === 'number' && count > 0 && <CountBadge count={count} className="absolute -right-0.5 -top-0.5" />}
        </button>
      </PopoverTrigger>
      <PopoverContent
        width={expanded ? expandedWidth || 'w-[28rem]' : width}
        className={cn('flex flex-col p-0 transition-[width,max-height] duration-200 ease-out', expanded ? 'max-h-[75vh]' : 'max-h-[30rem]')}
      >
        <div className="flex items-center justify-between gap-2 border-b border-ink-100 px-4 py-3 dark:border-ink-800">
          <p className="text-sm font-bold text-ink-900 dark:text-white">{title}</p>
          <div className="flex items-center gap-1">
            {headerAction}
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? 'Collapse' : 'Expand'}
              title={expanded ? 'Collapse' : 'Expand'}
              className="rounded-md p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:text-ink-500 dark:hover:bg-ink-800 dark:hover:text-ink-100"
            >
              {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">{children}</div>

        {viewAllHref && (
          <div className="border-t border-ink-100 px-4 py-2.5 dark:border-ink-800">
            <WidgetViewAllLink href={viewAllHref} label={viewAllLabel} />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function WidgetViewAllLink({ href, label }: { href: string; label: string }) {
  const close = usePopoverClose();
  return (
    <Link href={href} onClick={close} className="block text-center text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">
      {label}
    </Link>
  );
}

export function WidgetLoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8">
      <Loader2 className="h-5 w-5 animate-spin text-ink-300 dark:text-ink-600" />
      <div className="w-full space-y-2 px-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-10 w-full animate-pulse rounded-lg bg-ink-100 dark:bg-ink-800" />
        ))}
      </div>
    </div>
  );
}

export function WidgetEmptyState({ icon: Icon, message, hint }: { icon: React.ComponentType<{ className?: string }>; message: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-100 text-ink-400 dark:bg-ink-800 dark:text-ink-500">
        <Icon className="h-5 w-5" />
      </span>
      <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">{message}</p>
      {hint && <p className="text-xs text-ink-400 dark:text-ink-500">{hint}</p>}
    </div>
  );
}

export function WidgetErrorState({ message = "Couldn't load this right now." }: { message?: string }) {
  return (
    <div className="px-4 py-8 text-center text-sm text-ink-400 dark:text-ink-500">
      {message}
    </div>
  );
}
