'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { useRecommendations, useMyRecommendationRequests, useRequestRecommendation } from '@/hooks/trust/useTrust';
import { PageHeader, PageContainer, TwoColumnLayout, LoadingBlock, EmptyState } from '@/components/trust/shared';
import { cn } from '@/lib/cn';

const TABS = [
  { key: 'received', label: 'Received' },
  { key: 'given', label: 'Given' },
  { key: 'requests', label: 'Requests' },
] as const;

export default function RecommendationsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('received');
  const [requestPersonId, setRequestPersonId] = useState('');
  const [requestMessage, setRequestMessage] = useState('');

  const { data: received } = useRecommendations('received');
  const { data: given } = useRecommendations('given');
  const { data: requests } = useMyRecommendationRequests();
  const requestRecommendation = useRequestRecommendation();

  const list = tab === 'received' ? received : tab === 'given' ? given : undefined;

  return (
    <PageContainer>
      <PageHeader title="Recommendations" subtitle="Professional relationship statements from people you've worked with." />

      <TwoColumnLayout
        main={
          <>
            <KpiGrid className="lg:grid-cols-3">
              <KpiCard label="Recommendations received" value={received?.length ?? 0} />
              <KpiCard label="Recommendations given" value={given?.length ?? 0} />
              <KpiCard label="Verified relationships" value={(received || []).filter((r) => r.verificationStatus === 'relationship_verified').length} />
            </KpiGrid>

            <div className="flex flex-wrap gap-2 border-b border-ink-100 pb-3 dark:border-ink-800">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={cn('rounded-full px-3 py-1.5 text-sm font-semibold', tab === t.key ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300')}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'requests' ? (
              <div className="space-y-3">
                <Card className="p-4">
                  <p className="font-display text-sm font-bold text-ink-900 dark:text-white">Request a recommendation</p>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                    <input
                      placeholder="Person's user ID"
                      value={requestPersonId}
                      onChange={(e) => setRequestPersonId(e.target.value)}
                      className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm dark:border-ink-700 dark:bg-ink-900"
                    />
                    <input
                      placeholder="Personal message (optional)"
                      value={requestMessage}
                      onChange={(e) => setRequestMessage(e.target.value)}
                      className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm dark:border-ink-700 dark:bg-ink-900"
                    />
                    <Button
                      size="sm"
                      loading={requestRecommendation.isPending}
                      onClick={() => requestRecommendation.mutate({ requestedPersonId: requestPersonId, message: requestMessage || undefined })}
                    >
                      Send request
                    </Button>
                  </div>
                </Card>
                {(requests || []).length === 0 ? (
                  <EmptyState title="No pending requests" body="Requests you send will appear here until they're fulfilled." />
                ) : (
                  (requests || []).map((r) => (
                    <Card key={r.id} className="p-4">
                      <p className="text-sm font-semibold text-ink-900 dark:text-white">Request pending</p>
                      {r.message && <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{r.message}</p>}
                      <Badge tone="warning" className="mt-2">Pending</Badge>
                    </Card>
                  ))
                )}
              </div>
            ) : !list || list.length === 0 ? (
              <EmptyState title="No recommendations yet" body="Recommendations from managers, colleagues and clients will appear here." />
            ) : (
              <div className="space-y-3">
                {list.map((rec) => (
                  <Card key={rec.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar name={rec.author?.name || 'Member'} src={rec.author?.avatarUrl} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-ink-900 dark:text-white">{rec.author?.name || 'Gigvora member'}</p>
                          {rec.verificationStatus === 'relationship_verified' && (
                            <Badge tone="success"><CheckCircle2 className="mr-1 h-3 w-3" />Verified relationship</Badge>
                          )}
                        </div>
                        {rec.author?.headline && <p className="text-xs text-ink-400 dark:text-ink-500">{rec.author.headline}</p>}
                        <Badge tone="neutral" className="mt-1 capitalize">{rec.relationshipType.replace(/_/g, ' ')}</Badge>
                        <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">{rec.body}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        }
        rail={
          <Card className="p-4">
            <p className="font-display text-sm font-bold text-ink-900 dark:text-white">About recommendations</p>
            <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">
              Recommendations are professional relationship statements, not marketplace star ratings. A relationship is only
              marked verified when backed by a real shared employment or project record.
            </p>
          </Card>
        }
      />
    </PageContainer>
  );
}
