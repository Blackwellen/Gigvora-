'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNowStrict } from 'date-fns';
import { ArrowLeft, Loader2, Lock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ReactionBar } from '@/components/feed/ReactionBar';
import { CommentThread } from '@/components/feed/CommentThread';
import { PostShareMenu } from '@/components/feed/PostShareMenu';
import { usePollDetail, useVotePollDetailed, useClosePoll, type PollDetailData } from '@/hooks/useFeed';
import { useSession } from '@/lib/session/SessionContext';
import { getApiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';

export default function PollDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: poll, isLoading, isError, error } = usePollDetail(id);
  const [commentsOpen, setCommentsOpen] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-6">
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
            / <span className="text-ink-600 dark:text-ink-300">Poll Detail</span>
          </nav>
        </div>

        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        )}

        {isError && (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-white dark:border-ink-700 dark:bg-ink-900 py-16 text-center">
            <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Poll not found</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error, "This poll doesn't exist or you don't have access to it.")}</p>
          </div>
        )}

        {poll && (
          <>
            <PollHeader poll={poll} onShare={() => setShareOpen(true)} />
            <PollResultsCard poll={poll} />

            <Card className="p-4">
              <div className="mb-1">
                <ReactionBar
                  postId={poll.post.id}
                  myReaction={poll.post.myReaction}
                  likeCount={poll.post.likeCount}
                  commentCount={poll.post.commentCount}
                  shareCount={poll.post.shareCount}
                  isSaved={poll.post.isSaved}
                  onToggleComments={() => setCommentsOpen((v) => !v)}
                  onShare={() => setShareOpen(true)}
                />
              </div>
              {commentsOpen && (
                <div className="mt-3">
                  <CommentThread postId={poll.post.id} />
                </div>
              )}
            </Card>

            <PostShareMenu postId={poll.post.id} open={shareOpen} onClose={() => setShareOpen(false)} />
          </>
        )}
      </main>

      {poll && (
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-4">
            <PollInsightsCard poll={poll} />
          </div>
        </aside>
      )}
    </div>
  );
}

function PollHeader({ poll, onShare }: { poll: PollDetailData; onShare: () => void }) {
  const { user } = useSession();
  const closePoll = useClosePoll();
  const [error, setError] = useState<string | null>(null);
  const daysLeft = poll.endsAt ? Math.ceil((new Date(poll.endsAt).getTime() - Date.now()) / (24 * 3600 * 1000)) : null;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-display text-xl font-bold tracking-[-0.01em] text-ink-900 dark:text-white">{poll.question}</h1>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-semibold',
              poll.status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'
            )}
          >
            {poll.status === 'active' ? 'Active' : 'Closed'}
          </span>
          {poll.status === 'active' && daysLeft !== null && daysLeft >= 0 && (
            <span className="text-xs font-medium text-ink-400 dark:text-ink-500">Closes in {daysLeft} day{daysLeft === 1 ? '' : 's'}</span>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={poll.author?.name || 'Unknown'} size="md" />
          <div>
            <p className="text-sm font-bold text-ink-900 dark:text-white">{poll.author?.name}</p>
            {poll.author?.headline && <p className="text-xs text-ink-500 dark:text-ink-400">{poll.author.headline}</p>}
            <p className="text-xs text-ink-400 dark:text-ink-500">{formatDistanceToNowStrict(new Date(poll.createdAt), { addSuffix: true })} · Public poll</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onShare}>
            Share
          </Button>
          {poll.isOwner && poll.status === 'active' && (
            <Button
              variant="danger"
              size="sm"
              loading={closePoll.isPending}
              onClick={async () => {
                setError(null);
                try {
                  await closePoll.mutateAsync(poll.id);
                } catch (err) {
                  setError(getApiErrorMessage(err, 'Could not close this poll.'));
                }
              }}
            >
              Close poll
            </Button>
          )}
          {!poll.isOwner && !user && (
            <span className="flex items-center gap-1 text-xs font-medium text-ink-400 dark:text-ink-500">
              <Lock className="h-4 w-4 text-ink-300" aria-hidden /> Sign in to vote
            </span>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function PollResultsCard({ poll }: { poll: PollDetailData }) {
  const votePoll = useVotePollDetailed();
  const [error, setError] = useState<string | null>(null);
  const hasVoted = poll.myVotes.length > 0;
  const isClosed = poll.status === 'closed';

  async function vote(optionId: string) {
    if (isClosed) return;
    setError(null);
    const nextOptionIds = poll.multipleChoice
      ? poll.myVotes.includes(optionId)
        ? poll.myVotes.filter((id) => id !== optionId)
        : [...poll.myVotes, optionId]
      : [optionId];
    try {
      await votePoll.mutateAsync({ pollId: poll.id, optionIds: nextOptionIds });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not record your vote.'));
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-sm font-bold text-ink-900 dark:text-white">Poll results</h2>
        <span className="text-xs font-semibold text-ink-500 dark:text-ink-400">
          Total votes <span className="text-ink-900 dark:text-white">{poll.totalVotes}</span>
        </span>
      </div>

      <div className="space-y-3">
        {poll.options.map((option) => {
          const mine = poll.myVotes.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              disabled={isClosed || votePoll.isPending}
              onClick={() => vote(option.id)}
              className="block w-full text-left disabled:cursor-default"
            >
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className={cn('font-medium', mine ? 'text-brand-700 dark:text-brand-400' : 'text-ink-800 dark:text-ink-100')}>
                  {option.label} {mine && '✓'}
                </span>
                <span className="font-semibold text-ink-600 dark:text-ink-300">
                  {option.percentage}% <span className="text-ink-400 dark:text-ink-500">({option.voteCount})</span>
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                <div
                  className={cn('h-full rounded-full transition-all', mine ? 'bg-brand-600' : 'bg-brand-300 dark:bg-brand-700')}
                  style={{ width: `${option.percentage}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {isClosed && <p className="mt-3 text-xs text-ink-400 dark:text-ink-500">This poll is closed — voting is no longer available.</p>}
      {!hasVoted && !isClosed && <p className="mt-3 text-xs text-ink-400 dark:text-ink-500">Select an option to cast your vote.</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {/* "Trend over time" is intentionally omitted: a re-vote deletes the
          voter's prior poll_votes row before inserting the new one, so
          created_at only reflects each voter's current choice, not a
          historical event log — a chart built on that would misrepresent
          past vote counts. "Audience segmentation" and "voter breakdown by
          role/company size" have no backing data (no per-vote demographic
          capture) and are omitted rather than shown as decoration. */}
    </Card>
  );
}

function PollInsightsCard({ poll }: { poll: PollDetailData }) {
  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-bold text-ink-900 dark:text-white">Poll insights</h3>
      <div className="grid grid-cols-2 gap-3 text-center">
        <div>
          <p className="text-lg font-bold text-ink-900 dark:text-white">{poll.totalVotes}</p>
          <p className="text-xs text-ink-500 dark:text-ink-400">Total votes</p>
        </div>
        <div>
          <p className="text-lg font-bold text-ink-900 dark:text-white">{poll.uniqueVoters}</p>
          <p className="text-xs text-ink-500 dark:text-ink-400">Unique voters</p>
        </div>
        <div>
          <p className="text-lg font-bold text-ink-900 dark:text-white">{poll.post.commentCount}</p>
          <p className="text-xs text-ink-500 dark:text-ink-400">Comments</p>
        </div>
        <div>
          <p className="text-lg font-bold text-ink-900 dark:text-white">{poll.post.shareCount}</p>
          <p className="text-xs text-ink-500 dark:text-ink-400">Shares</p>
        </div>
      </div>
      {/* Impressions, engagement rate, AI summary, and voter breakdown by
          role/company size are omitted — no impression-tracking table and
          no demographic capture on poll_votes exist in this schema, so
          there is no real number to show for any of them. */}
    </Card>
  );
}
