'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ShieldCheck, Star, ThumbsUp } from 'lucide-react';
import { ProfessionalProfileShell } from '@/components/profile/ProfessionalProfileShell';
import { ProfileRightRailCard } from '@/components/profile/ProfileRightRailCard';
import { ProfileEmptyState } from '@/components/profile/ProfileEmptyState';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';

type Aggregate = {
  overallRating: number | null;
  reviewCount: number;
  trustScore: number | null;
  trustBand: string | null;
  verifiedReviewCount: number;
  repeatClientRate: number | null;
  onTimeDelivery: number | null;
  recommendationRate: number | null;
};
type Review = {
  id: string;
  overall_rating: string;
  review_text: string | null;
  context_type: 'project' | 'gig' | 'service_booking';
  created_at: string;
  is_verified: boolean;
  reviewer: { id: string; first_name: string; last_name: string; headline: string | null } | null;
  ratings: Array<{ dimension: string; score: string }>;
  context: { id: string; title: string } | null;
};
type ReviewInsights = { available: true; strengths: Array<{ dimension: string; label: string }>; improvements: Array<{ dimension: string; label: string }> } | { available: false; reason: string };

const FILTERS = [
  { key: 'all', label: 'All reviews' },
  { key: 'projects', label: 'Projects' },
  { key: 'gigs', label: 'Gigs' },
  { key: 'highest', label: 'Highest rated' },
  { key: 'critical', label: 'Critical feedback' },
] as const;

function Stars({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${value.toFixed(1)} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={cn('h-3.5 w-3.5', i < Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-ink-200')} />
      ))}
    </span>
  );
}

export default function ReviewsPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all');

  const { data: aggregate } = useQuery({
    queryKey: ['professional-profile', 'reviews', 'aggregate'],
    queryFn: async () => (await api.get<{ data: Aggregate }>('/professional-profile/me/reviews/aggregate')).data.data,
  });
  const { data: reviews, isLoading } = useQuery({
    queryKey: ['professional-profile', 'reviews', filter],
    queryFn: async () => (await api.get<{ data: Review[] }>('/professional-profile/me/reviews', { params: { filter: filter === 'all' ? undefined : filter } })).data.data,
  });
  const { data: insights } = useQuery({
    queryKey: ['professional-profile', 'insights', 'review-insights'],
    queryFn: async () => (await api.get<{ data: ReviewInsights }>('/professional-profile/me/insights/review-insights')).data.data,
  });

  return (
    <ProfessionalProfileShell
      active="reviews"
      rightRail={
        <>
          <ProfileRightRailCard title="AI trust summary" beta action={<ShieldCheck className="h-4 w-4 text-purple-500" />}>
            {aggregate?.trustScore != null ? (
              <div>
                <p className="font-display text-2xl font-bold text-ink-900 dark:text-white">{aggregate.trustScore}<span className="text-sm font-medium text-ink-400"> / 100</span></p>
                <p className="text-sm capitalize text-ink-500 dark:text-ink-400">{aggregate.trustBand}</p>
              </div>
            ) : (
              <p className="text-sm text-ink-400 dark:text-ink-500">Not enough verified reviews yet to calculate a trust score.</p>
            )}
          </ProfileRightRailCard>

          <ProfileRightRailCard title="What clients love" action={<ThumbsUp className="h-4 w-4 text-emerald-500" />}>
            {!insights ? (
              <p className="text-sm text-ink-400 dark:text-ink-500">Loading…</p>
            ) : insights.available ? (
              insights.strengths.length > 0 ? (
                <ul className="space-y-2 text-sm text-ink-600 dark:text-ink-300">
                  {insights.strengths.map((s) => (
                    <li key={s.dimension}>• {s.label}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-400 dark:text-ink-500">No standout themes yet.</p>
              )
            ) : (
              <p className="text-sm text-ink-400 dark:text-ink-500">{insights.reason}</p>
            )}
          </ProfileRightRailCard>

          {insights?.available && insights.improvements.length > 0 && (
            <ProfileRightRailCard title="Areas to improve">
              <ul className="space-y-2 text-sm text-ink-600 dark:text-ink-300">
                {insights.improvements.map((s) => (
                  <li key={s.dimension}>• {s.label}</li>
                ))}
              </ul>
            </ProfileRightRailCard>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <KpiTile label="Overall rating" value={aggregate?.overallRating != null ? aggregate.overallRating.toFixed(1) : '—'} />
          <KpiTile label="Trust score" value={aggregate?.trustScore != null ? String(aggregate.trustScore) : '—'} />
          <KpiTile label="Verified reviews" value={String(aggregate?.verifiedReviewCount ?? 0)} />
          <KpiTile label="Repeat clients" value={aggregate?.repeatClientRate != null ? `${aggregate.repeatClientRate}%` : '—'} />
          <KpiTile label="On-time delivery" value={aggregate?.onTimeDelivery != null ? `${aggregate.onTimeDelivery}%` : '—'} />
          <KpiTile label="Recommendation rate" value={aggregate?.recommendationRate != null ? `${aggregate.recommendationRate}%` : '—'} />
        </div>

        <div className="flex flex-wrap gap-2 border-b border-ink-100 pb-3 dark:border-ink-800">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm font-semibold',
                filter === f.key ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        )}

        {!isLoading && (reviews || []).length === 0 && (
          <ProfileEmptyState title="No verified reviews yet" body="Reviews appear here once a client completes a project, gig or service booking with you." />
        )}

        <div className="space-y-3">
          {(reviews || []).map((review) => (
            <Card key={review.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink-900 dark:text-white">
                    {review.reviewer ? `${review.reviewer.first_name} ${review.reviewer.last_name}` : 'Client'}
                  </p>
                  {review.reviewer?.headline && <p className="text-xs text-ink-400 dark:text-ink-500">{review.reviewer.headline}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="neutral" className="capitalize">{review.context_type.replace('_', ' ')}</Badge>
                  {review.is_verified && <Badge tone="success">Verified</Badge>}
                </div>
              </div>
              {review.context?.title && <p className="mt-1 text-sm font-semibold text-brand-600">{review.context.title}</p>}
              <div className="mt-1 flex items-center gap-2">
                <Stars value={Number(review.overall_rating)} />
                <span className="text-sm font-semibold text-ink-800 dark:text-ink-100">{Number(review.overall_rating).toFixed(1)}</span>
              </div>
              {review.review_text && <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">{review.review_text}</p>}
              {review.ratings.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-ink-100 pt-2 dark:border-ink-800 sm:grid-cols-4">
                  {review.ratings.map((r) => (
                    <div key={r.dimension} className="text-xs">
                      <p className="capitalize text-ink-400 dark:text-ink-500">{r.dimension.replace(/_/g, ' ')}</p>
                      <Stars value={Number(r.score)} />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </ProfessionalProfileShell>
  );
}

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-3 text-center">
      <p className="font-display text-lg font-bold text-ink-900 dark:text-white">{value}</p>
      <p className="text-[11px] text-ink-400 dark:text-ink-500">{label}</p>
    </Card>
  );
}
