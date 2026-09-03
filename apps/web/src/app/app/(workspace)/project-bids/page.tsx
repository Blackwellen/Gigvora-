'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Tabs } from '@/components/ui/Tabs';
import { ProjectShell } from '@/components/projects/ProjectShell';
import { useProjectBids, useUpdateBidStatus } from '@/hooks/projects/useProjectBids';
import { useProject } from '@/hooks/projects/useProject';
import type { PmBidStatus } from '@/hooks/projects/types';
import { getApiErrorMessage } from '@/lib/api';

const STATUS_TONE: Record<PmBidStatus, 'neutral' | 'warning' | 'success' | 'danger' | 'brand'> = {
  submitted: 'neutral',
  shortlisted: 'brand',
  interviewing: 'warning',
  changes_requested: 'warning',
  accepted: 'success',
  declined: 'danger',
};

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'submitted', label: 'New' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'accepted', label: 'Accepted' },
] as const;

function BidsInner() {
  const projectId = useSearchParams().get('projectId') || undefined;
  const [filter, setFilter] = useState<(typeof FILTER_TABS)[number]['key']>('all');
  const { data: bids, isLoading, isError, error } = useProjectBids(projectId, filter === 'all' ? undefined : filter);
  const updateStatus = useUpdateBidStatus(projectId);
  const { data: project } = useProject(projectId);
  const canManage = project?.myRole === 'owner' || project?.myRole === 'manager';

  return (
    <ProjectShell
      projectId={projectId}
      activeTab="bids"
      tabCounts={{ bids: bids?.length }}
      actions={
        canManage ? (
          <Link href={`/app/invite-to-project?projectId=${projectId}`}>
            <Button size="sm" variant="outline">
              Invite a professional
            </Button>
          </Link>
        ) : undefined
      }
    >
      <Tabs tabs={FILTER_TABS.map((t) => ({ ...t }))} value={filter} onChange={(k) => setFilter(k as typeof filter)} className="mb-3" />

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}
      {isError && <Card className="py-14 text-center text-sm text-ink-400">{getApiErrorMessage(error)}</Card>}
      {!isLoading && !isError && (bids || []).length === 0 && (
        <Card className="py-14 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No proposals yet</p>
          <p className="mt-1 text-sm text-ink-400 dark:text-ink-500">Proposals submitted by professionals interested in this project will appear here.</p>
        </Card>
      )}

      <div className="space-y-2">
        {(bids || []).map((bid) => {
          const name = `${bid.professional?.firstName || ''} ${bid.professional?.lastName || ''}`.trim() || 'Professional';
          return (
            <Card key={bid.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Avatar name={name} size="md" />
                  <div className="min-w-0">
                    <Link href={`/app/project-bid-detail?projectId=${projectId}&bidId=${bid.id}`} className="text-sm font-semibold text-ink-900 hover:text-brand-700 dark:text-white">
                      {name}
                    </Link>
                    {bid.professional?.headline && <p className="text-xs text-ink-400 dark:text-ink-500">{bid.professional.headline}</p>}
                    <p className="mt-1 line-clamp-2 max-w-md text-sm text-ink-500 dark:text-ink-400">{bid.coverLetter}</p>
                    <p className="mt-1 text-xs text-ink-400 dark:text-ink-500">Submitted {format(new Date(bid.createdAt), 'MMM d, yyyy')}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge tone={STATUS_TONE[bid.status]} className="capitalize">
                    {bid.status.replace('_', ' ')}
                  </Badge>
                  <p className="text-sm font-bold text-ink-900 dark:text-white">
                    ${bid.proposedAmount.toLocaleString()} <span className="text-xs font-normal text-ink-400">{bid.rateType}</span>
                  </p>
                </div>
              </div>

              {canManage && bid.status === 'submitted' && (
                <div className="mt-3 flex gap-1.5">
                  <Button size="sm" onClick={() => updateStatus.mutate({ bidId: bid.id, status: 'shortlisted' })} loading={updateStatus.isPending}>
                    Shortlist
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ bidId: bid.id, status: 'declined' })} loading={updateStatus.isPending}>
                    Decline
                  </Button>
                </div>
              )}
              {canManage && (bid.status === 'shortlisted' || bid.status === 'interviewing') && (
                <div className="mt-3 flex gap-1.5">
                  <Button size="sm" onClick={() => updateStatus.mutate({ bidId: bid.id, status: 'accepted' })} loading={updateStatus.isPending}>
                    Accept
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ bidId: bid.id, status: 'declined' })} loading={updateStatus.isPending}>
                    Decline
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </ProjectShell>
  );
}

export default function ProjectBidsPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <BidsInner />
    </Suspense>
  );
}
