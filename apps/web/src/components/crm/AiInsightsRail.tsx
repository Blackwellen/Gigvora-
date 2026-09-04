'use client';

import { Sparkles } from 'lucide-react';

/**
 * Simple right-rail section wrapper for grouping AI cards (NextBestActionCard,
 * ForecastCard, RelationshipHealthRing explanations, etc.) under one "AI
 * insights" heading with the purple sparkle accent — purely presentational,
 * doesn't fetch anything itself so callers control which cards/data go in.
 */
export function AiInsightsRail({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 px-1">
        <Sparkles className="h-3.5 w-3.5 text-purple-500" />
        <p className="text-xs font-bold uppercase tracking-wide text-ink-400 dark:text-ink-500">AI insights</p>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
