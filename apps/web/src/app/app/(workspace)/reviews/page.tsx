'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { useReviews, useVoteHelpful, useTrustOverviewMe } from '@/hooks/trust/useTrust';
import { PageHeader, PageContainer, TwoColumnLayout, LoadingBlock, EmptyState, Stars } from '@/components/trust/shared';
import { cn } from '@/lib/cn';

const TABS = [
  { key: 'received', label: 'Received' },
  { key: 'written', label: 'Written' },
] as const;

export default function ReviewsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('received');
  const [sort, setSort] = useState('recent');
  const { data, isLoading } = useReviews(tab, { sort });
  const { data: overview } = useTrustOverviewMe();
  const voteHelpful = useVoteHelpful();

  const reviews = data?.data || [];

  return (
    <PageContainer>
      <PageHeader
        title="Reviews"
        subtitle="Manage reviews received and written across verified Gigvora interactions."
        action={
          <Link href="/app/write-review/new">
            <Button size="sm">Write a review</Button>
          </Link>
        }
      />

      <TwoColumnLayout
        main={
          <>
            <KpiGrid className="lg:grid-cols-4">
              <KpiCard label="Average rating" value={overview?.reputation.ratingAverage != null ? overview.reputation.ratingAverage.toFixed(1) : '—'} />
              <KpiCard label="Reviews this month" value={reviews.filter((r) => new Date(r.createdAt) > new Date(Date.now() - 30 * 86400000)).length} />
              <KpiCard label="Verified" value={overview?.reputation.verifiedReviewCount ?? 0} />
              <KpiCard label="Total reviews" value={overview?.reputation.reviewCount ?? 0} />
            </KpiGrid>

            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 pb-3 dark:border-ink-800">
              <div className="flex flex-wrap gap-2">
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
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="h-8 rounded-lg border border-ink-200 bg-white px-2 text-xs font-semibold text-ink-600 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300"
              >
                <option value="recent">Newest</option>
                <option value="highest">Highest</option>
                <option value="lowest">Lowest</option>
                <option value="helpful">Most helpful</option>
              </select>
            </div>

            {isLoading && <LoadingBlock />}
            {!isLoading && reviews.length === 0 && <EmptyState title="No reviews yet" body="Reviews appear here once a client completes a project, gig or service booking with you." />}

            <div className="space-y-3">
              {reviews.map((review) => (
                <Card key={review.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-ink-900 dark:text-white">{review.reviewer?.name || 'Client'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone="neutral" className="capitalize">{review.contextType.replace('_', ' ')}</Badge>
                      {review.isVerified && <Badge tone="success"><ShieldCheck className="mr-1 h-3 w-3" />Verified</Badge>}
                    </div>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <Stars value={review.overallRating} />
                    <span className="text-sm font-semibold text-ink-800 dark:text-ink-100">{review.overallRating.toFixed(1)}</span>
                    {review.editedAt && <span className="text-xs text-ink-400 dark:text-ink-500">Edited</span>}
                  </div>
                  {review.reviewText && <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">{review.reviewText}</p>}
                  {review.aspectRatings.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-ink-100 pt-2 dark:border-ink-800 sm:grid-cols-4">
                      {review.aspectRatings.map((r) => (
                        <div key={r.dimension} className="text-xs">
                          <p className="capitalize text-ink-400 dark:text-ink-500">{r.dimension.replace(/_/g, ' ')}</p>
                          <Stars value={r.score} />
                        </div>
                      ))}
                    </div>
                  )}
                  {review.response && (
                    <div className="mt-3 rounded-lg bg-ink-50 p-3 text-sm text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                      <p className="text-xs font-semibold text-ink-400 dark:text-ink-500">Response</p>
                      {review.response.response_text}
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-3 border-t border-ink-100 pt-2 dark:border-ink-800">
                    <button
                      type="button"
                      onClick={() => voteHelpful.mutate({ reviewId: review.id, isHelpful: true })}
                      className="flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-brand-600 dark:text-ink-400"
                    >
                      <ThumbsUp className="h-3.5 w-3.5" /> Helpful ({review.helpfulCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => voteHelpful.mutate({ reviewId: review.id, isHelpful: false })}
                      className="flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-ink-700 dark:text-ink-400"
                    >
                      <ThumbsDown className="h-3.5 w-3.5" /> ({review.notHelpfulCount})
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </>
        }
        rail={
          <Card className="p-4">
            <p className="font-display text-sm font-bold text-ink-900 dark:text-white">Review Integrity</p>
            <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">
              Reviews are ranked by recency, verified interaction and helpfulness — not just by rating.
            </p>
          </Card>
        }
      />
    </PageContainer>
  );
}
