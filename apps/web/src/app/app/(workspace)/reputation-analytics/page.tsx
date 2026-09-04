'use client';

import { Card, CardHeader } from '@/components/ui/Card';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { useTrustOverviewMe, useIsPlatformStaff, useInternalTrustAnalytics } from '@/hooks/trust/useTrust';
import { PageHeader, PageContainer, LoadingBlock } from '@/components/trust/shared';

export default function ReputationAnalyticsPage() {
  const { data: overview, isLoading } = useTrustOverviewMe();
  const { data: isStaff } = useIsPlatformStaff();
  const { data: internal } = useInternalTrustAnalytics(Boolean(isStaff));

  if (isLoading || !overview) return <PageContainer><LoadingBlock /></PageContainer>;

  const dist = overview.reputation.ratingDistribution || {};
  const maxBucket = Math.max(1, ...Object.values(dist).map((v) => Number(v)));

  return (
    <PageContainer>
      <PageHeader title="Reputation Analytics" subtitle="How your reputation is trending across Gigvora." />

      <KpiGrid className="lg:grid-cols-5">
        <KpiCard label="Average rating" value={overview.reputation.ratingAverage != null ? overview.reputation.ratingAverage.toFixed(1) : '—'} />
        <KpiCard label="Review count" value={overview.reputation.reviewCount} />
        <KpiCard label="Recommendations" value={overview.reputation.recommendationCount} />
        <KpiCard label="Endorsements" value={overview.reputation.endorsementCount} />
        <KpiCard label="Completed contracts" value={overview.reputation.completedTransactionCount} />
      </KpiGrid>

      <Card>
        <CardHeader title="Rating distribution" />
        <div className="space-y-2 p-5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = Number(dist[String(star)] || 0);
            return (
              <div key={star} className="flex items-center gap-3">
                <span className="w-10 text-xs font-semibold text-ink-500 dark:text-ink-400">{star} star</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${(count / maxBucket) * 100}%` }} />
                </div>
                <span className="w-6 text-right text-xs text-ink-400 dark:text-ink-500">{count}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader title="Key insights" />
        <ul className="space-y-2 p-5 text-sm text-ink-600 dark:text-ink-300">
          {overview.reputation.reviewCount === 0 && <li>You don&apos;t have enough review history yet to surface trend insights.</li>}
          {overview.reputation.verifiedReviewCount > 0 && (
            <li>{Math.round((overview.reputation.verifiedReviewCount / Math.max(1, overview.reputation.reviewCount)) * 100)}% of your reviews come from verified Gigvora interactions.</li>
          )}
          {overview.reputation.disputeRate != null && <li>Your dispute rate is {overview.reputation.disputeRate}%.</li>}
        </ul>
      </Card>

      {isStaff && internal && (
        <Card>
          <CardHeader title="Internal platform analytics (restricted)" />
          <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
            <KpiCard label="Report volume" value={internal.reportVolume} />
            <KpiCard label="Decisions made" value={internal.decisionVolume} />
            <KpiCard label="Appeal overturn rate" value={internal.appealOverturnRate != null ? `${Math.round(internal.appealOverturnRate * 100)}%` : '—'} />
            <KpiCard label="Verified accounts" value={internal.verifiedCount} />
          </div>
        </Card>
      )}
    </PageContainer>
  );
}
