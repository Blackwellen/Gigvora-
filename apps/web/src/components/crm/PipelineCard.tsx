'use client';

import { format } from 'date-fns';
import { CalendarClock } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { OpportunityCloseScore } from './OpportunityCloseScore';
import { cn } from '@/lib/cn';
import type { CrmOpportunity } from '@/hooks/crm/types';

const CURRENCY_FORMATTERS = new Map<string, Intl.NumberFormat>();
function formatMoney(value: number, currency: string) {
  let formatter = CURRENCY_FORMATTERS.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: 0 });
    CURRENCY_FORMATTERS.set(currency, formatter);
  }
  return formatter.format(value);
}

/**
 * Pipeline kanban card: account name, opportunity name, value, probability,
 * close date, primary contact avatar, AI close score, and a next-step chip.
 * Account logo/owner avatar are left to the caller to pass in via
 * `accountName`/`accountLogoUrl`/`ownerName`/`ownerAvatarUrl` since the
 * opportunity row itself doesn't carry the joined account/owner identity —
 * PipelineBoard resolves those from its own accounts/members lookups.
 */
export function PipelineCard({
  opportunity,
  accountName,
  accountLogoUrl,
  primaryContactName,
  primaryContactAvatarUrl,
  ownerName,
  ownerAvatarUrl,
  isDragging,
  onDragStart,
  onDragOverCard,
  onDropOnCard,
  onClick,
}: {
  opportunity: CrmOpportunity;
  accountName?: string;
  accountLogoUrl?: string | null;
  primaryContactName?: string | null;
  primaryContactAvatarUrl?: string | null;
  ownerName?: string | null;
  ownerAvatarUrl?: string | null;
  isDragging?: boolean;
  onDragStart?: () => void;
  onDragOverCard?: (e: React.DragEvent) => void;
  onDropOnCard?: (e: React.DragEvent) => void;
  onClick?: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOverCard}
      onDrop={onDropOnCard}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-roledescription="Draggable opportunity card"
      className={cn(
        'cursor-grab space-y-2 rounded-xl border border-ink-100 bg-white p-3 shadow-sm transition-opacity active:cursor-grabbing dark:border-ink-800 dark:bg-ink-900',
        isDragging && 'opacity-40'
      )}
    >
      {accountName && (
        <div className="flex items-center gap-1.5">
          {accountLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={accountLogoUrl} alt={accountName} className="h-4 w-4 shrink-0 rounded object-cover ring-1 ring-black/5" />
          ) : null}
          <p className="truncate text-xs font-semibold text-ink-400 dark:text-ink-500">{accountName}</p>
        </div>
      )}
      <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{opportunity.name}</p>

      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-ink-900 dark:text-white">{formatMoney(opportunity.value, opportunity.currency)}</span>
        <span className="text-xs font-semibold text-ink-400 dark:text-ink-500">{opportunity.probability}%</span>
      </div>

      {opportunity.expected_close_date && (
        <div className="flex items-center gap-1 text-xs text-ink-400 dark:text-ink-500">
          <CalendarClock className="h-3 w-3" />
          {format(new Date(opportunity.expected_close_date), 'MMM d, yyyy')}
        </div>
      )}

      {opportunity.next_step && (
        <span className="inline-block truncate rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
          {opportunity.next_step}
        </span>
      )}

      <div className="flex items-center justify-between pt-1">
        <div className="flex -space-x-1.5">
          {primaryContactName && <Avatar name={primaryContactName} src={primaryContactAvatarUrl} size="xs" className="ring-2 ring-white dark:ring-ink-900" />}
          {ownerName && <Avatar name={ownerName} src={ownerAvatarUrl} size="xs" className="ring-2 ring-white dark:ring-ink-900" />}
        </div>
        <OpportunityCloseScore score={opportunity.ai_close_score} confidence={opportunity.ai_close_confidence} size={28} />
      </div>
    </div>
  );
}
