'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, Link2, Loader2, Workflow } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { RecruiterSeatGate } from '@/components/recruiter/RecruiterSeatGate';
import { useRecruiterSeat } from '@/hooks/recruiter/useRecruiterSeat';
import { usePipeline, useMovePipelineCandidate, usePipelineRealtime } from '@/hooks/recruiter-pro/usePipeline';
import type { PipelineCandidate } from '@/hooks/recruiter-pro/types';
import { getApiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';

function CandidateCard({ candidate, draggable, onDragStart }: { candidate: PipelineCandidate; draggable: boolean; onDragStart: () => void }) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      className={cn(
        'rounded-xl border border-ink-100 bg-white p-3 shadow-sm dark:border-ink-800 dark:bg-ink-900',
        draggable && 'cursor-grab active:cursor-grabbing'
      )}
    >
      <div className="flex items-center gap-2">
        <Avatar name={candidate.candidate_name} src={candidate.candidate_avatar_url} size="sm" />
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-900 dark:text-white">{candidate.candidate_name}</p>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        {candidate.sla_breached && <Badge tone="danger">SLA breach</Badge>}
        {candidate.ats_synced && (
          <Badge tone="brand">
            <Link2 className="mr-1 h-2.5 w-2.5" /> ATS synced
          </Badge>
        )}
      </div>
    </div>
  );
}

function PipelineInner() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const jobId = searchParams.get('jobId');
  const boardKey = { projectId, jobId };

  const { data: seat } = useRecruiterSeat();
  const isPro = seat?.tier === 'pro';
  const { data: board, isLoading, isError, error } = usePipeline(boardKey);
  const moveCandidate = useMovePipelineCandidate(boardKey);
  usePipelineRealtime(projectId || undefined, boardKey);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  function handleDrop(stageId: string) {
    if (draggingId) {
      moveCandidate.mutate({ candidateId: draggingId, toStageId: stageId });
    }
    setDraggingId(null);
    setDragOverStage(null);
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 px-4 py-5 lg:px-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
          <Workflow className="h-5 w-5 text-brand-600" /> Pipeline
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Drag candidates between stages. Changes sync live to everyone viewing this pipeline.</p>
      </div>

      {!projectId && !jobId && (
        <Card className="py-16 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-amber-500" />
          <p className="mt-2 text-sm font-semibold text-ink-700 dark:text-ink-200">No project or job selected</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">
            Open the pipeline from a project or job via its <code>?projectId=</code> or <code>?jobId=</code> link.
          </p>
        </Card>
      )}

      {(projectId || jobId) && isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {isError && (
        <Card className="py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load the pipeline</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      )}

      {board && !isLoading && !isError && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {board.stages
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((stage) => {
              const candidates = board.candidates.filter((c) => c.stage_id === stage.id);
              const overWip = stage.wip_limit !== null && candidates.length > stage.wip_limit;
              return (
                <div
                  key={stage.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverStage(stage.id);
                  }}
                  onDragLeave={() => setDragOverStage((prev) => (prev === stage.id ? null : prev))}
                  onDrop={() => handleDrop(stage.id)}
                  className={cn(
                    'flex w-72 shrink-0 flex-col rounded-2xl border border-ink-100 bg-ink-50/60 p-2.5 dark:border-ink-800 dark:bg-ink-900/40',
                    dragOverStage === stage.id && 'ring-2 ring-brand-400'
                  )}
                >
                  <div className="mb-2 flex items-center justify-between px-1">
                    <p className="text-sm font-bold text-ink-800 dark:text-ink-100">{stage.name}</p>
                    <Badge tone={overWip ? 'danger' : 'neutral'}>
                      {candidates.length}
                      {stage.wip_limit !== null ? ` / ${stage.wip_limit}` : ''}
                    </Badge>
                  </div>
                  <div className="flex flex-1 flex-col gap-2">
                    {candidates.length === 0 && <p className="px-2 py-6 text-center text-xs text-ink-400 dark:text-ink-500">No candidates</p>}
                    {candidates.map((candidate) => (
                      <CandidateCard
                        key={candidate.id}
                        candidate={candidate}
                        draggable={isPro}
                        onDragStart={() => setDraggingId(candidate.candidate_id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {board && !isPro && (
        <p className="text-xs text-ink-400 dark:text-ink-500">
          SLA breach flags, ATS sync badges and drag-to-move are Recruiter Pro features. Upgrade your seat to unlock them.
        </p>
      )}
    </div>
  );
}

export default function PipelinePage() {
  return (
    <RecruiterSeatGate>
      <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-brand-500" /></div>}>
        <PipelineInner />
      </Suspense>
    </RecruiterSeatGate>
  );
}
