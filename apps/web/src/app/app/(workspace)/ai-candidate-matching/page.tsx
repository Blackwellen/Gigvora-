'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, Bot, Check, ChevronDown, ChevronUp, Info, Loader2, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { RecruiterSeatGate } from '@/components/recruiter/RecruiterSeatGate';
import { ProUpgradeBanner } from '@/components/recruiter-pro/ProUpgradeBanner';
import { useRecruiterSeat } from '@/hooks/recruiter/useRecruiterSeat';
import { useAiCandidateMatching, useOverrideAiMatch } from '@/hooks/recruiter-pro/useAiCandidateMatching';
import type { AiCandidateMatch, MatchDecisionStatus } from '@/hooks/recruiter-pro/types';
import { getApiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';

const CONFIDENCE_TONE: Record<AiCandidateMatch['confidence'], 'success' | 'warning' | 'neutral'> = {
  high: 'success',
  medium: 'warning',
  low: 'neutral',
};

const DECISION_TONE: Record<MatchDecisionStatus, 'success' | 'danger' | 'warning'> = {
  approved: 'success',
  rejected: 'danger',
  pending: 'warning',
};

function MatchCard({ match }: { match: AiCandidateMatch }) {
  const [expanded, setExpanded] = useState(false);
  const override = useOverrideAiMatch();

  function decide(status: MatchDecisionStatus) {
    override.mutate({ id: match.id, decision_status: status });
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={match.candidate_name} src={match.candidate_avatar_url} size="md" />
          <div>
            <p className="font-semibold text-ink-900 dark:text-white">{match.candidate_name}</p>
            {match.candidate_headline && <p className="text-xs text-ink-400 dark:text-ink-500">{match.candidate_headline}</p>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-lg font-bold text-brand-700 dark:text-brand-400">{match.match_score}%</span>
          <Badge tone={CONFIDENCE_TONE[match.confidence]} className="capitalize">
            {match.confidence} confidence
          </Badge>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
      >
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />} Why this match?
      </button>
      {expanded && (
        <div className="mt-2 rounded-xl bg-purple-50 p-3 dark:bg-purple-500/10">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-400">
            <Bot className="h-3.5 w-3.5" /> AI reasoning — advisory only
          </p>
          <ul className="list-inside list-disc space-y-1 text-xs text-ink-600 dark:text-ink-300">
            {match.why_match.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-ink-100 pt-3 dark:border-ink-800">
        <div className="flex items-center gap-1.5 text-xs text-ink-400 dark:text-ink-500">
          <Info className="h-3.5 w-3.5" /> Human decision required
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={DECISION_TONE[match.decision_status]} className="capitalize">
            {match.decision_status}
          </Badge>
          <Button size="sm" variant="outline" onClick={() => decide('rejected')} loading={override.isPending} disabled={match.decision_status === 'rejected'}>
            <X className="h-3.5 w-3.5" /> Reject
          </Button>
          <Button size="sm" onClick={() => decide('approved')} loading={override.isPending} disabled={match.decision_status === 'approved'}>
            <Check className="h-3.5 w-3.5" /> Approve
          </Button>
        </div>
      </div>
    </Card>
  );
}

function AiCandidateMatchingInner() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get('jobId');
  const projectId = searchParams.get('projectId');
  const { data: seat } = useRecruiterSeat();
  const isPro = seat?.tier === 'pro';
  const { data: matches, isLoading, isError, error } = useAiCandidateMatching({ jobId, projectId });

  return (
    <div className="mx-auto max-w-[1100px] space-y-5 px-4 py-5 lg:px-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
          <Bot className="h-5 w-5 text-purple-600" /> AI Candidate Matching
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Ranked, AI-generated candidate matches for advisory review — every match requires an explicit human decision before it affects a pipeline.
        </p>
      </div>

      {!isPro && <ProUpgradeBanner feature="AI candidate matching" />}

      {!jobId && !projectId && (
        <Card className="py-16 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-amber-500" />
          <p className="mt-2 text-sm font-semibold text-ink-700 dark:text-ink-200">No job or project selected</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">
            Open AI matching from a job or project via its <code>?jobId=</code> or <code>?projectId=</code> link to see ranked matches.
          </p>
        </Card>
      )}

      {(jobId || projectId) && isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {isError && (
        <Card className="py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load matches</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      )}

      {matches && !isLoading && !isError && matches.length === 0 && (
        <Card className="border-dashed py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No matches yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">AI matching runs periodically — check back soon or widen your search criteria.</p>
        </Card>
      )}

      {matches && matches.length > 0 && (
        <div className={cn('space-y-3', !isPro && 'pointer-events-none opacity-60')}>
          {matches.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AiCandidateMatchingPage() {
  return (
    <RecruiterSeatGate>
      <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-brand-500" /></div>}>
        <AiCandidateMatchingInner />
      </Suspense>
    </RecruiterSeatGate>
  );
}
