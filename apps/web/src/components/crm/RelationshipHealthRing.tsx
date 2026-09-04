'use client';

import { ScoreRing } from './ScoreRing';
import type { CrmScoreExplanation } from '@/hooks/crm/types';

/**
 * Relationship-health score ring — used on Contact/Account detail headers and
 * table cells. Thin label/convention wrapper over the shared ScoreRing
 * primitive (contact/account `relationship_health_score` + the matching
 * crm_ml_predictions explanation, capability='relationship_health').
 */
export function RelationshipHealthRing({
  score,
  explanation,
  size = 48,
}: {
  score: number | null | undefined;
  explanation?: CrmScoreExplanation | null;
  size?: number;
}) {
  return <ScoreRing score={score} label="Health" size={size} explanation={explanation} />;
}
