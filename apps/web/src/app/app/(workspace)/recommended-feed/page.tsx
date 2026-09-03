'use client';

import Link from 'next/link';
import { Sparkles, ThumbsDown, EyeOff } from 'lucide-react';
import { FeedShell } from '@/components/feed/FeedShell';
import { ProfileSummaryCard } from '@/components/feed/ProfileSummaryCard';
import { RecommendationRail } from '@/components/feed/RecommendationRail';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

const TABS = [{ key: 'recommended' as const, label: 'For you' }];

export default function RecommendedFeedPage() {
  return (
    <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-5 px-4 py-5 lg:grid-cols-[280px_minmax(0,1fr)_320px] lg:px-6">
      <aside className="hidden lg:block">
        <div className="sticky top-20">
          <ProfileSummaryCard />
        </div>
      </aside>

      <main className="min-w-0 space-y-4">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-xl font-bold tracking-[-0.01em] text-ink-900 dark:text-white">Recommended for You</h1>
          <Badge tone="brand">Beta</Badge>
        </div>
        <p className="-mt-3 text-sm text-ink-500 dark:text-ink-400">Personalized suggestions based on your activity and engagement.</p>

        <FeedShell
          tabs={TABS}
          initialTab="recommended"
          emptyTitle="No recommendations yet"
          emptyBody={() => 'Engage with a few posts and we will start surfacing relevant ones here.'}
        />
      </main>

      <aside className="hidden lg:block">
        <div className="sticky top-20 space-y-4">
          <HowRecommendationsWorkCard />
          <RecommendationRail />
        </div>
      </aside>
    </div>
  );
}

// The "Why you're seeing this" panel in the reference design is per-post,
// AI-attributed reasoning text ("You follow Acme Corp and engage with
// Product Design content") that nothing in this codebase computes today —
// building that would mean fabricating explanations. What's real is the
// ranking pipeline itself (feed_ranker, see recommendations.service.js /
// feedRankerClient.js) and the per-post controls that actually change it,
// so this panel explains the mechanism honestly instead of inventing copy.
function HowRecommendationsWorkCard() {
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center gap-1.5">
        <Sparkles className="h-4 w-4 text-brand-500" />
        <h3 className="text-sm font-bold text-ink-900 dark:text-white">How this feed works</h3>
      </div>
      <p className="text-sm text-ink-600 dark:text-ink-300">
        Posts are ranked by the <code className="text-xs">feed_ranker</code> model using engagement, recency, and your connections — the
        same ranking Live Feed&apos;s Top tab uses.
      </p>
      <div className="mt-3 space-y-1.5 text-xs text-ink-500 dark:text-ink-400">
        <p className="flex items-center gap-1.5">
          <ThumbsDown className="h-3.5 w-3.5 shrink-0" /> Use a post&apos;s <strong className="text-ink-700 dark:text-ink-200">···</strong> menu to mark it &ldquo;Not interested&rdquo;.
        </p>
        <p className="flex items-center gap-1.5">
          <EyeOff className="h-3.5 w-3.5 shrink-0" /> Hide an author or topic from the same menu — it&apos;s remembered and applied to every future feed request.
        </p>
      </div>
      <Link href="/app/live-feed" className="mt-3 inline-block text-xs font-semibold text-brand-600 hover:text-brand-700">
        View Live Feed
      </Link>
    </Card>
  );
}
