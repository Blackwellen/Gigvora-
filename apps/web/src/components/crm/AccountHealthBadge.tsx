'use client';

import { Badge } from '@/components/ui/Badge';
import { bandForScore } from './ScoreRing';

const BAND_TONE = { danger: 'danger', warning: 'warning', success: 'success' } as const;
const BAND_LABEL = { danger: 'At risk', warning: 'Needs attention', success: 'Healthy' } as const;

/** Compact account/contact relationship-health badge for table rows and list cards. */
export function AccountHealthBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return <Badge tone="neutral">No health data</Badge>;
  const band = bandForScore(score);
  return (
    <Badge tone={BAND_TONE[band]}>
      {BAND_LABEL[band]} ({score})
    </Badge>
  );
}
