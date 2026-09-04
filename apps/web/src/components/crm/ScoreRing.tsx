'use client';

import { useId } from 'react';
import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import type { CrmScoreExplanation } from '@/hooks/crm/types';

export type ScoreBand = 'danger' | 'warning' | 'success';

export function bandForScore(score: number | null | undefined): ScoreBand {
  if (score == null) return 'warning';
  if (score < 40) return 'danger';
  if (score < 70) return 'warning';
  return 'success';
}

const RING_COLOR: Record<ScoreBand, string> = {
  danger: '#dc2626',
  warning: '#d97706',
  success: '#059669',
};

const TEXT_TONE: Record<ScoreBand, string> = {
  danger: 'text-red-600 dark:text-red-400',
  warning: 'text-amber-600 dark:text-amber-400',
  success: 'text-emerald-600 dark:text-emerald-400',
};

/**
 * Generic 0-100 circular score gauge with a red/amber/green color band and a
 * "why?" popover rendering an explanation's factor list. Every AI/ML score
 * surfaced in the CRM (lead fit/intent, opportunity close, relationship
 * health) renders through this one primitive so the ring-drawing logic never
 * duplicates — see LeadScoreBadge / OpportunityCloseScore /
 * AccountHealthBadge / RelationshipHealthRing for the named, label-specific
 * wrappers.
 */
export function ScoreRing({
  score,
  label,
  size = 48,
  strokeWidth = 5,
  explanation,
  className,
}: {
  score: number | null | undefined;
  label?: string;
  size?: number;
  strokeWidth?: number;
  explanation?: CrmScoreExplanation | null;
  className?: string;
}) {
  const id = useId();
  const band = bandForScore(score);
  const value = score ?? 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

  const ring = (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-ink-100 dark:text-ink-800" />
          {score != null && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={RING_COLOR[band]}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('font-display text-xs font-bold', score != null ? TEXT_TONE[band] : 'text-ink-300 dark:text-ink-600')}>{score ?? '—'}</span>
        </div>
      </div>
      {label && <span className="text-[11px] font-medium text-ink-400 dark:text-ink-500">{label}</span>}
    </div>
  );

  if (!explanation) return ring;

  return (
    <Popover>
      <div className="flex flex-col items-center gap-1">
        {ring}
        <PopoverTrigger>
          <button
            type="button"
            aria-label={`Why this ${label ?? 'score'}?`}
            className="flex items-center gap-0.5 text-[11px] font-semibold text-ink-400 hover:text-brand-600 dark:text-ink-500 dark:hover:text-brand-400"
          >
            <Info className="h-3 w-3" /> why?
          </button>
        </PopoverTrigger>
      </div>
      <PopoverContent align="center" width="w-64" className="text-left">
        <p id={id} className="px-2 pb-2 pt-1 text-xs text-ink-500 dark:text-ink-400">
          {explanation.summary}
        </p>
        <div className="space-y-1 px-2 pb-2">
          {explanation.factors.map((factor, index) => (
            <div key={`${factor.factor}-${index}`} className="flex items-center justify-between gap-2 text-xs">
              <span className="capitalize text-ink-600 dark:text-ink-300">{factor.factor.replace(/_/g, ' ')}</span>
              <Badge tone={factor.points > 0 ? 'success' : factor.points < 0 ? 'danger' : 'neutral'}>
                {factor.points > 0 ? '+' : ''}
                {factor.points}
              </Badge>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
