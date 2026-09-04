'use client';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useResolveCrmDuplicate } from '@/hooks/crm/useCrmDuplicates';
import type { CrmDuplicateCandidate, CrmScoreExplanation } from '@/hooks/crm/types';
import { cn } from '@/lib/cn';

const HIDDEN_FIELDS = new Set(['id', 'owner_type', 'owner_id', 'workspace_id', 'created_at', 'updated_at', 'archived_at', 'tags']);

function fieldLabel(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Side-by-side field diff for a duplicate-candidate pair, plus the
 * merge/keep-separate/link/ignore actions wired to POST
 * /crm/duplicates/:id/resolve. `recordA`/`recordB` are the raw contact/lead/
 * account rows (their shape depends on candidate.object_type); differing
 * fields are highlighted so the reviewer can eyeball what a merge would
 * reconcile before picking a winner via `mergeInto`.
 */
export function DuplicateComparisonPanel({
  candidate,
  recordA,
  recordB,
  onResolved,
}: {
  candidate: CrmDuplicateCandidate;
  recordA: Record<string, unknown>;
  recordB: Record<string, unknown>;
  onResolved?: () => void;
}) {
  const resolveDuplicate = useResolveCrmDuplicate();
  const explanation = candidate.match_features_jsonb as CrmScoreExplanation | undefined;

  const fields = Array.from(new Set([...Object.keys(recordA), ...Object.keys(recordB)])).filter((f) => !HIDDEN_FIELDS.has(f));

  function resolve(action: 'merge' | 'kept_separate' | 'linked' | 'ignored', mergeInto?: string) {
    resolveDuplicate.mutate({ id: candidate.id, action, mergeInto }, { onSuccess: () => onResolved?.() });
  }

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-ink-900 dark:text-white">Possible duplicate {candidate.object_type}</p>
          <p className="text-xs text-ink-400 dark:text-ink-500">Match score {candidate.match_score}/100</p>
        </div>
        <Badge tone={candidate.match_score >= 85 ? 'danger' : 'warning'}>{candidate.match_score >= 85 ? 'High confidence' : 'Possible match'}</Badge>
      </div>

      {explanation && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {explanation.factors
            .filter((f) => f.points > 0)
            .map((f) => (
              <Badge key={f.factor} tone="neutral">
                {fieldLabel(f.factor)} +{f.points}
              </Badge>
            ))}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-ink-100 dark:border-ink-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400 dark:border-ink-800 dark:text-ink-500">
            <tr>
              <th className="px-3 py-2 font-medium">Field</th>
              <th className="px-3 py-2 font-medium">Record A</th>
              <th className="px-3 py-2 font-medium">Record B</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field) => {
              const a = recordA[field];
              const b = recordB[field];
              const differs = JSON.stringify(a) !== JSON.stringify(b);
              return (
                <tr key={field} className="border-b border-ink-50 last:border-0 dark:border-ink-800/60">
                  <td className="px-3 py-2 font-medium text-ink-500 dark:text-ink-400">{fieldLabel(field)}</td>
                  <td className={cn('px-3 py-2', differs ? 'font-semibold text-amber-700 dark:text-amber-400' : 'text-ink-700 dark:text-ink-200')}>{String(a ?? '—')}</td>
                  <td className={cn('px-3 py-2', differs ? 'font-semibold text-amber-700 dark:text-amber-400' : 'text-ink-700 dark:text-ink-200')}>{String(b ?? '—')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => resolve('ignored')} loading={resolveDuplicate.isPending}>
          Ignore
        </Button>
        <Button variant="outline" size="sm" onClick={() => resolve('kept_separate')} loading={resolveDuplicate.isPending}>
          Keep separate
        </Button>
        <Button variant="outline" size="sm" onClick={() => resolve('linked')} loading={resolveDuplicate.isPending}>
          Link
        </Button>
        <Button variant="outline" size="sm" onClick={() => resolve('merge', candidate.record_b_id)} loading={resolveDuplicate.isPending}>
          Merge into B
        </Button>
        <Button size="sm" onClick={() => resolve('merge', candidate.record_a_id)} loading={resolveDuplicate.isPending}>
          Merge into A
        </Button>
      </div>
    </Card>
  );
}
