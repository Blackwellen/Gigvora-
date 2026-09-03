'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { ProjectShell } from '@/components/projects/ProjectShell';
import { useProjectBids, useUpdateBidStatus } from '@/hooks/projects/useProjectBids';
import { useProject } from '@/hooks/projects/useProject';

function BidDetailInner() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId') || undefined;
  const bidId = searchParams.get('bidId');
  const { data: bids, isLoading } = useProjectBids(projectId);
  const updateStatus = useUpdateBidStatus(projectId);
  const { data: project } = useProject(projectId);
  const canManage = project?.myRole === 'owner' || project?.myRole === 'manager';

  const bid = bids?.find((b) => b.id === bidId);
  const name = bid ? `${bid.professional?.firstName || ''} ${bid.professional?.lastName || ''}`.trim() || 'Professional' : '';

  return (
    <ProjectShell projectId={projectId} activeTab="bids">
      <Link href={`/app/project-bids?projectId=${projectId}`} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-600 hover:text-brand-700 dark:text-ink-300">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to proposals
      </Link>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {!isLoading && !bid && (
        <Card className="py-14 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Proposal not found</p>
        </Card>
      )}

      {bid && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <Avatar name={name} size="lg" />
              <div>
                <h1 className="text-lg font-bold text-ink-900 dark:text-white">{name}</h1>
                {bid.professional?.headline && <p className="text-sm text-ink-500 dark:text-ink-400">{bid.professional.headline}</p>}
              </div>
            </div>

            <h3 className="mb-1 mt-5 text-sm font-bold text-ink-900 dark:text-white">Cover letter</h3>
            <p className="whitespace-pre-wrap text-sm text-ink-600 dark:text-ink-300">{bid.coverLetter}</p>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label="Proposed amount" value={`$${bid.proposedAmount.toLocaleString()}`} />
              <Field label="Rate type" value={bid.rateType} />
              <Field label="Est. duration" value={bid.estimatedDurationDays ? `${bid.estimatedDurationDays} days` : '—'} />
              <Field label="Available from" value={bid.availableFrom ? format(new Date(bid.availableFrom), 'MMM d, yyyy') : '—'} />
              <Field label="Submitted" value={format(new Date(bid.createdAt), 'MMM d, yyyy')} />
            </div>
          </Card>

          <div className="space-y-3">
            <Card className="p-4">
              <h3 className="mb-2 text-sm font-bold text-ink-900 dark:text-white">Status</h3>
              <Badge tone="brand" className="capitalize">
                {bid.status.replace('_', ' ')}
              </Badge>
              <div className="mt-3 flex flex-col gap-1.5">
                {canManage && bid.status !== 'accepted' && bid.status !== 'declined' && (
                  <>
                    <Button size="sm" onClick={() => updateStatus.mutate({ bidId: bid.id, status: 'accepted' })} loading={updateStatus.isPending}>
                      Accept proposal
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ bidId: bid.id, status: 'shortlisted' })} loading={updateStatus.isPending}>
                      Shortlist
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ bidId: bid.id, status: 'declined' })} loading={updateStatus.isPending}>
                      Decline
                    </Button>
                  </>
                )}
              </div>
            </Card>
            <Card className="p-4 text-xs text-ink-400 dark:text-ink-500">
              Skill-match / trust-score intelligence rails require Domain 14 professional-profile data — not wired into this phase.
            </Card>
          </div>
        </div>
      )}
    </ProjectShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-400 dark:text-ink-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold capitalize text-ink-900 dark:text-white">{value}</p>
    </div>
  );
}

export default function ProjectBidDetailPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <BidDetailInner />
    </Suspense>
  );
}
