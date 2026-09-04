'use client';

import { Badge } from '@/components/ui/Badge';
import { bandForScore } from './ScoreRing';

const BAND_TONE = { danger: 'danger', warning: 'warning', success: 'success' } as const;

/**
 * Compact fit/intent score badge for Lead list rows and cards (table density
 * doesn't afford a full ring — see ScoreRing for the detail-page version).
 */
export function LeadScoreBadge({ label, score }: { label: 'Fit' | 'Intent'; score: number | null | undefined }) {
  if (score == null) {
    return <Badge tone="neutral">{label}: —</Badge>;
  }
  return (
    <Badge tone={BAND_TONE[bandForScore(score)]}>
      {label}: {score}
    </Badge>
  );
}
