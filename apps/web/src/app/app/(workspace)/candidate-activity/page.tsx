'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Activity, Linkedin, Loader2, Mail, MessageSquare, Workflow } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { RecruiterSeatGate } from '@/components/recruiter/RecruiterSeatGate';
import { ProUpgradeBanner } from '@/components/recruiter-pro/ProUpgradeBanner';
import { useRecruiterSeat } from '@/hooks/recruiter/useRecruiterSeat';
import { useCandidateActivity } from '@/hooks/recruiter-pro/useCandidateActivity';
import type { CandidateActivityEvent } from '@/hooks/recruiter-pro/types';
import { getApiErrorMessage } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

const SOURCE_META: Record<CandidateActivityEvent['source'], { icon: typeof Activity; tone: 'brand' | 'success' | 'warning'; label: string }> = {
  outreach: { icon: Mail, tone: 'brand', label: 'Outreach' },
  collaboration: { icon: MessageSquare, tone: 'warning', label: 'Collaboration' },
  pipeline: { icon: Workflow, tone: 'success', label: 'Pipeline' },
};

function CandidateActivityInner() {
  const { data: seat } = useRecruiterSeat();
  const isPro = seat?.tier === 'pro';
  const searchParams = useSearchParams();
  const candidateId = searchParams.get('candidateId');
  const { data, isLoading, isError, error } = useCandidateActivity(candidateId);

  return (
    <div className="mx-auto max-w-[900px] space-y-5 px-4 py-5 lg:px-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
          <Activity className="h-5 w-5 text-purple-600" /> Candidate Activity
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">A unified ledger of outreach, collaboration and pipeline events for this candidate.</p>
      </div>

      {!isPro && <ProUpgradeBanner feature="Candidate Activity" />}

      {!candidateId && (
        <Card className="py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No candidate selected</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">
            Open this page from a candidate&rsquo;s profile or pipeline card to see their activity timeline.
          </p>
        </Card>
      )}

      {candidateId && isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {candidateId && isError && (
        <Card className="py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load activity</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      )}

      {candidateId && data && !isLoading && !isError && (
        <Card>
          <CardHeader title={`${data.length} event${data.length === 1 ? '' : 's'}`} />
          <div className="px-5 pb-5 pt-2">
            {data.length === 0 && <p className="py-10 text-center text-sm text-ink-400 dark:text-ink-500">No activity recorded for this candidate yet.</p>}
            <ol className="relative space-y-5 border-l border-ink-100 pl-5 dark:border-ink-800">
              {data.map((event) => {
                const meta = SOURCE_META[event.source];
                const Icon = event.channel === 'linkedin' ? Linkedin : meta.icon;
                return (
                  <li key={event.id} className="relative">
                    <span className="absolute -left-[27px] flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-ink-100 dark:border-ink-900 dark:bg-ink-800">
                      <Icon className="h-3 w-3 text-ink-600 dark:text-ink-300" />
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      {event.actor_name && <span className="text-xs font-semibold text-ink-600 dark:text-ink-300">{event.actor_name}</span>}
                      <span className="text-xs text-ink-400 dark:text-ink-500">{formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}</span>
                    </div>
                    <p className="mt-1 text-sm text-ink-700 dark:text-ink-200">{event.summary}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function CandidateActivityPage() {
  return (
    <RecruiterSeatGate>
      <Suspense
        fallback={
          <div className="flex h-[60vh] items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-ink-300" />
          </div>
        }
      >
        <CandidateActivityInner />
      </Suspense>
    </RecruiterSeatGate>
  );
}
