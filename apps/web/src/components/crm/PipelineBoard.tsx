'use client';

import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { getApiErrorMessage } from '@/lib/api';
import { useCrmAccounts } from '@/hooks/crm/useCrmAccounts';
import { useCrmContacts } from '@/hooks/crm/useCrmContacts';
import { useCrmOpportunities, useMoveCrmOpportunity } from '@/hooks/crm/useCrmOpportunities';
import { useCrmPipelineStages } from '@/hooks/crm/useCrmPipelineStages';
import { PipelineCard } from './PipelineCard';
import { cn } from '@/lib/cn';
import type { CrmOpportunitiesFilter } from '@/hooks/crm/types';

/**
 * Pipeline kanban: columns from useCrmPipelineStages (order_index), cards
 * from useCrmOpportunities grouped by stage_id and sorted by board_order.
 * Native HTML5 drag/drop, mirroring the Domain 18 board/page.tsx pattern —
 * onDrop calls useMoveCrmOpportunity(); the query invalidation that hook
 * already does on success is the reconciliation step (no separate optimistic
 * cache write, matching the Domain 18 precedent of relying on
 * invalidate-then-refetch rather than manual cache patching).
 */
export function PipelineBoard({ filter = {}, onOpenOpportunity }: { filter?: CrmOpportunitiesFilter; onOpenOpportunity?: (opportunityId: string) => void }) {
  const { data: stages, isLoading: stagesLoading } = useCrmPipelineStages();
  const { data: oppsData, isLoading: oppsLoading, isError, error } = useCrmOpportunities({ ...filter, limit: 200 });
  const { data: accountsData } = useCrmAccounts({ limit: 200 });
  const { data: contactsData } = useCrmContacts({ limit: 200 });
  const moveOpportunity = useMoveCrmOpportunity();

  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const accountsById = useMemo(() => new Map((accountsData?.data || []).map((a) => [a.id, a])), [accountsData]);
  const contactsById = useMemo(() => new Map((contactsData?.data || []).map((c) => [c.id, c])), [contactsData]);
  const opportunities = oppsData?.data || [];

  function handleDrop(stageId: string, index: number) {
    if (!dragId) return;
    const opp = opportunities.find((o) => o.id === dragId);
    setDragOverStage(null);
    setDragId(null);
    if (!opp) return;
    if (opp.stage_id === stageId && opp.board_order === index) return;
    moveOpportunity.mutate({ id: opp.id, stageId, boardOrder: index });
  }

  if (stagesLoading || oppsLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="py-14 text-center">
        <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load the pipeline</p>
        <p className="mt-1 text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 overflow-x-auto pb-2 sm:grid-cols-2 lg:grid-flow-col lg:auto-cols-[280px]">
      {(stages || []).map((stage) => {
        const stageOpps = opportunities.filter((o) => o.stage_id === stage.id).sort((a, b) => a.board_order - b.board_order);
        const stageValue = stageOpps.reduce((sum, o) => sum + Number(o.value || 0), 0);

        return (
          <div
            key={stage.id}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverStage(stage.id);
            }}
            onDragLeave={() => setDragOverStage((s) => (s === stage.id ? null : s))}
            onDrop={() => handleDrop(stage.id, stageOpps.length)}
            className={cn(
              'min-w-[260px] rounded-2xl border p-2.5',
              dragOverStage === stage.id ? 'border-brand-300 bg-brand-50/50 dark:border-brand-500/40 dark:bg-brand-500/5' : 'border-ink-100 bg-ink-50/50 dark:border-ink-800 dark:bg-ink-900/40'
            )}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="text-sm font-bold text-ink-900 dark:text-white">{stage.label}</h3>
              <span className="rounded-full bg-ink-100 px-1.5 text-xs font-semibold text-ink-500 dark:bg-ink-800 dark:text-ink-400">{stageOpps.length}</span>
            </div>
            <p className="mb-2 px-1 text-xs text-ink-400 dark:text-ink-500">£{stageValue.toLocaleString()}</p>
            <div className="space-y-2">
              {stageOpps.map((opp, index) => {
                const account = accountsById.get(opp.account_id);
                const contact = opp.primary_contact_id ? contactsById.get(opp.primary_contact_id) : undefined;
                return (
                  <PipelineCard
                    key={opp.id}
                    opportunity={opp}
                    accountName={account?.name}
                    accountLogoUrl={account?.logo_url}
                    primaryContactName={contact?.display_name || [contact?.first_name, contact?.last_name].filter(Boolean).join(' ') || undefined}
                    primaryContactAvatarUrl={contact?.avatar_url}
                    isDragging={dragId === opp.id}
                    onDragStart={() => setDragId(opp.id)}
                    onDragOverCard={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragOverStage(stage.id);
                    }}
                    onDropOnCard={(e) => {
                      e.stopPropagation();
                      handleDrop(stage.id, index);
                    }}
                    onClick={() => onOpenOpportunity?.(opp.id)}
                  />
                );
              })}
              {stageOpps.length === 0 && <p className="px-2 py-6 text-center text-xs text-ink-400 dark:text-ink-500">Drop an opportunity here</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
