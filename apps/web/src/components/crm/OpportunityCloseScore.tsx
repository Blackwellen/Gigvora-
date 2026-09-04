'use client';

import { ScoreRing } from './ScoreRing';
import type { CrmScoreExplanation } from '@/hooks/crm/types';

/**
 * Opportunity ai_close_score ring — used on Opportunity Detail and
 * PipelineCard. `confidence` is shown as a small caption since a low-activity
 * deal's close score is intentionally low-confidence (see
 * scoreOpportunityClose in ai.service.js).
 */
export function OpportunityCloseScore({
  score,
  confidence,
  explanation,
  size = 40,
}: {
  score: number | null | undefined;
  confidence?: number | null;
  explanation?: CrmScoreExplanation | null;
  size?: number;
}) {
  return (
    <div className="flex flex-col items-center">
      <ScoreRing score={score} label="Close" size={size} explanation={explanation} />
      {confidence != null && <span className="mt-0.5 text-[10px] text-ink-300 dark:text-ink-600">{confidence}% confidence</span>}
    </div>
  );
}
