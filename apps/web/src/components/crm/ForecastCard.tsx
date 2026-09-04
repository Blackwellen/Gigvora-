'use client';

import { useState } from 'react';
import { ChevronDown, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import type { CrmScoreExplanation } from '@/hooks/crm/types';

/**
 * Right-rail forecast/close-likelihood card for Opportunity Detail —
 * ai_close_score + ai_close_confidence with a "View reasoning" expand
 * (never a bare unexplained number, per the house AI-surface rule). Purple
 * accent per the house AI visual language.
 */
export function ForecastCard({
  score,
  confidence,
  explanation,
  weightedValue,
  currency = 'GBP',
}: {
  score: number | null | undefined;
  confidence?: number | null;
  explanation?: CrmScoreExplanation | null;
  weightedValue?: number;
  currency?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  if (score == null) return null;

  return (
    <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4 dark:border-purple-500/30 dark:bg-purple-500/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
            <TrendingUp className="h-3.5 w-3.5" />
          </span>
          <p className="text-sm font-bold text-purple-800 dark:text-purple-300">AI close forecast</p>
        </div>
        <span className="text-lg font-bold text-purple-800 dark:text-purple-300">{score}%</span>
      </div>

      {weightedValue != null && (
        <p className="mt-1 text-xs text-purple-700/80 dark:text-purple-400/80">
          Weighted value: {new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: 0 }).format(weightedValue)}
        </p>
      )}
      {confidence != null && <p className="mt-0.5 text-xs text-purple-700/70 dark:text-purple-400/70">{confidence}% model confidence</p>}

      {explanation && (
        <>
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="mt-2 flex items-center gap-1 text-xs font-semibold text-purple-700 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
          >
            View reasoning <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} />
          </button>
          {expanded && (
            <div className="mt-2 space-y-1">
              {explanation.factors.map((factor, index) => (
                <div key={`${factor.factor}-${index}`} className="flex items-center justify-between text-xs">
                  <span className="capitalize text-purple-800/90 dark:text-purple-300/90">{factor.factor.replace(/_/g, ' ')}</span>
                  <Badge tone={factor.points > 0 ? 'success' : factor.points < 0 ? 'danger' : 'neutral'}>
                    {factor.points > 0 ? '+' : ''}
                    {factor.points}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
