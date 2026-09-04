'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { ArrowLeft, Loader2, Check } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ReactionBar } from '@/components/feed/ReactionBar';
import { CommentThread } from '@/components/feed/CommentThread';
import { PostShareMenu } from '@/components/feed/PostShareMenu';
import { ContentBlockRenderer } from '@/components/feed/ContentBlockRenderer';
import {
  useIssueDetail,
  useNewsletterIssues,
  useSubscribeNewsletter,
  useUnsubscribeNewsletter,
  useSubscriberGrowth,
  type IssueDetailData,
  type NewsletterData,
} from '@/hooks/useNewsletters';
import { getApiErrorMessage } from '@/lib/api';

export default function NewsletterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: issue, isLoading, isError, error } = useIssueDetail(id);
  const [commentsOpen, setCommentsOpen] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <div className="mx-auto grid grid-cols-1 gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-6">
      <main className="min-w-0 space-y-4">
        <div className="flex items-center gap-3">
          <Link
            href="/app/live-feed"
            className="flex items-center gap-1.5 rounded-lg border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-sm font-semibold text-ink-600 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Link>
          <nav className="text-sm text-ink-400 dark:text-ink-500">
            <Link href="/app/live-feed" className="hover:underline">
              Home
            </Link>{' '}
            / <span className="text-ink-600 dark:text-ink-300">Newsletter Detail</span>
          </nav>
        </div>

        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        )}

        {isError && (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-white dark:border-ink-700 dark:bg-ink-900 py-16 text-center">
            <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Issue not found</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error, "This newsletter issue doesn't exist or you don't have access to it.")}</p>
          </div>
        )}

        {issue && (
          <>
            <IssueHeader issue={issue} onShare={() => setShareOpen(true)} />

            {issue.article?.coverImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={issue.article.coverImageUrl} alt={issue.subject} className="w-full rounded-2xl border border-ink-100 dark:border-ink-800 object-cover" />
            )}

            <Card className="p-5">{issue.article && <ContentBlockRenderer blocks={issue.article.contentJson} />}</Card>

            <IssueNav issue={issue} />

            <Card className="p-4">
              <div className="mb-1">
                <ReactionBar
                  postId={issue.post.id}
                  myReaction={issue.post.myReaction}
                  likeCount={issue.post.likeCount}
                  commentCount={issue.post.commentCount}
                  shareCount={issue.post.shareCount}
                  isSaved={issue.post.isSaved}
                  onToggleComments={() => setCommentsOpen((v) => !v)}
                  onShare={() => setShareOpen(true)}
                />
              </div>
              {commentsOpen && (
                <div className="mt-3">
                  <CommentThread postId={issue.post.id} />
                </div>
              )}
            </Card>

            <PostShareMenu postId={issue.post.id} open={shareOpen} onClose={() => setShareOpen(false)} />
          </>
        )}
      </main>

      {issue && (
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-4">
            <NewsletterStatsCard newsletter={issue.newsletter} />
            <EditionArchiveCard newsletterId={issue.newsletterId} currentIssueId={issue.id} />
            <SubscriberGrowthCard newsletterId={issue.newsletterId} />
            {issue.topDiscussion && <RecentDiscussionCard issue={issue} />}
          </div>
        </aside>
      )}
    </div>
  );
}

function IssueHeader({ issue, onShare }: { issue: IssueDetailData; onShare: () => void }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {/* No standalone newsletter-index page exists yet this phase —
                the publication name is shown as plain text rather than a
                dead link. */}
            <span className="text-sm font-bold text-brand-700 dark:text-brand-400">{issue.newsletter.title}</span>
            <span className="text-xs font-semibold text-ink-400 dark:text-ink-500">Edition #{issue.issueNumber}</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-[-0.01em] text-ink-900 dark:text-white">{issue.subject}</h1>
          {issue.previewText && <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{issue.previewText}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onShare}>
            Share
          </Button>
          <SubscribeButton newsletter={issue.newsletter} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Avatar name={issue.post.author?.name || 'Unknown'} size="sm" />
        <div>
          <p className="text-sm font-semibold text-ink-900 dark:text-white">{issue.post.author?.name}</p>
          <p className="text-xs text-ink-400 dark:text-ink-500">
            {issue.publishedAt ? format(new Date(issue.publishedAt), 'MMM d, yyyy') : 'Draft'}
            {issue.article && <> · {issue.article.readingTimeMinutes} min read</>}
          </p>
        </div>
      </div>
    </div>
  );
}

function SubscribeButton({ newsletter }: { newsletter: NewsletterData }) {
  const subscribe = useSubscribeNewsletter();
  const unsubscribe = useUnsubscribeNewsletter();
  // Optimistic local override — flips immediately on click, then reconciles
  // with the server response (or reverts on failure).
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isSubscribed = optimistic ?? newsletter.isSubscribed;
  const pending = subscribe.isPending || unsubscribe.isPending;

  async function toggle() {
    setError(null);
    const next = !isSubscribed;
    setOptimistic(next);
    try {
      if (next) await subscribe.mutateAsync(newsletter.id);
      else await unsubscribe.mutateAsync(newsletter.id);
      setOptimistic(null);
    } catch (err) {
      setOptimistic(null);
      setError(getApiErrorMessage(err, 'Could not update your subscription.'));
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <Button variant={isSubscribed ? 'outline' : 'primary'} size="sm" disabled={pending} onClick={toggle}>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isSubscribed ? <Check className="h-3.5 w-3.5" /> : null}
          {isSubscribed ? 'Subscribed' : 'Subscribe'}
        </Button>
        <span className="text-xs font-medium text-ink-400 dark:text-ink-500">{formatSubscribers(newsletter.subscriberCount)} subscribers</span>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function formatSubscribers(count: number) {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return String(count);
}

function IssueNav({ issue }: { issue: IssueDetailData }) {
  if (!issue.previousIssue && !issue.nextIssue) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-ink-100 dark:border-ink-800 pt-3 text-sm">
      {issue.previousIssue ? (
        <Link href={`/app/newsletter-detail/${issue.previousIssue.id}`} className="min-w-0 flex-1 text-left">
          <span className="block text-xs text-ink-400 dark:text-ink-500">← Previous edition</span>
          <span className="block truncate font-semibold text-ink-800 dark:text-ink-100">{issue.previousIssue.subject}</span>
        </Link>
      ) : (
        <span />
      )}
      {issue.nextIssue && (
        <Link href={`/app/newsletter-detail/${issue.nextIssue.id}`} className="min-w-0 flex-1 text-right">
          <span className="block text-xs text-ink-400 dark:text-ink-500">Next edition →</span>
          <span className="block truncate font-semibold text-ink-800 dark:text-ink-100">{issue.nextIssue.subject}</span>
        </Link>
      )}
    </div>
  );
}

function NewsletterStatsCard({ newsletter }: { newsletter: NewsletterData }) {
  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-bold text-ink-900 dark:text-white">Newsletter stats</h3>
      <div className="grid grid-cols-2 gap-3 text-center">
        <div>
          <p className="text-lg font-bold text-ink-900 dark:text-white">{formatSubscribers(newsletter.subscriberCount)}</p>
          <p className="text-xs text-ink-500 dark:text-ink-400">Subscribers</p>
        </div>
        <div>
          <p className="text-lg font-bold text-ink-900 dark:text-white">{newsletter.issueCount}</p>
          <p className="text-xs text-ink-500 dark:text-ink-400">Issues published</p>
        </div>
      </div>
      {/* Open rate, avg. read time, and reply counts are omitted — there is
          no email-open or read-time tracking table in this schema. */}
    </Card>
  );
}

function EditionArchiveCard({ newsletterId, currentIssueId }: { newsletterId: string; currentIssueId: string }) {
  const { data: issues, isLoading } = useNewsletterIssues(newsletterId);
  if (isLoading || !issues || issues.length === 0) return null;

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-bold text-ink-900 dark:text-white">Edition archive</h3>
      <div className="space-y-2">
        {issues.map((iss) => (
          <Link
            key={iss.id}
            href={`/app/newsletter-detail/${iss.id}`}
            className={`block rounded-lg px-2 py-1.5 text-sm ${iss.id === currentIssueId ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-400' : 'text-ink-700 hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-ink-800'}`}
          >
            <span className="mr-1.5 text-xs text-ink-400 dark:text-ink-500">#{iss.issueNumber}</span>
            {iss.subject}
          </Link>
        ))}
      </div>
    </Card>
  );
}

function SubscriberGrowthCard({ newsletterId }: { newsletterId: string }) {
  const { data: points, isLoading } = useSubscriberGrowth(newsletterId);
  // Only rendered when there's more than one distinct day of real
  // subscribed_at data — a single point isn't a "growth" trend, so it's
  // omitted below that threshold rather than shown as a flat, meaningless
  // line.
  if (isLoading || !points || points.length < 2) return null;

  const max = Math.max(...points.map((p) => p.count), 1);
  const first = points[0];
  const last = points[points.length - 1];
  const peak = points.reduce((a, b) => (b.count > a.count ? b : a), points[0]);
  const trendSummary = `New subscribers per day from ${first.day} to ${last.day}: started at ${first.count}, ended at ${last.count}, peaking at ${peak.count} on ${peak.day}.`;

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-bold text-ink-900 dark:text-white">Subscriber growth</h3>
      <div className="flex h-20 items-end gap-1" role="img" aria-label={trendSummary}>
        {points.map((p, idx) => (
          <div key={idx} className="flex-1 rounded-t bg-brand-400 dark:bg-brand-600" style={{ height: `${Math.max((p.count / max) * 100, 4)}%` }} title={`${p.day}: ${p.count}`} aria-hidden />
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-400 dark:text-ink-500">New subscribers per day</p>
    </Card>
  );
}

function RecentDiscussionCard({ issue }: { issue: IssueDetailData }) {
  if (!issue.topDiscussion) return null;
  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-bold text-ink-900 dark:text-white">Recent discussion</h3>
      <div className="flex gap-2.5">
        <Avatar name={issue.topDiscussion.author?.name || 'Unknown'} size="sm" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink-900 dark:text-white">{issue.topDiscussion.author?.name}</p>
          <p className="line-clamp-3 text-sm text-ink-600 dark:text-ink-300">{issue.topDiscussion.body}</p>
          <p className="mt-0.5 text-xs text-ink-400 dark:text-ink-500">{formatDistanceToNowStrict(new Date(issue.topDiscussion.createdAt), { addSuffix: true })}</p>
        </div>
      </div>
    </Card>
  );
}
