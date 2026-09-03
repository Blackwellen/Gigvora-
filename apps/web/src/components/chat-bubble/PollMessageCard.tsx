'use client';

import { useState } from 'react';
import { BarChart3, Loader2 } from 'lucide-react';
import { usePoll, useVotePoll } from '@/hooks/useChatBubbleData';

/**
 * Renders a poll message inline in the thread: `GET /conversations/polls/:pollId` for live
 * state, `POST /conversations/polls/:pollId/vote` to vote. Both endpoints are new — if the poll
 * can't be loaded (404/network error while the backend is still being built), this falls back
 * to plain text rather than crashing the thread, per the graceful-integration requirement.
 */
export function PollMessageCard({ pollId }: { pollId: string }) {
  const { data: poll, isLoading } = usePoll(pollId);
  const vote = useVotePoll();
  const [error, setError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-ink-100 bg-white px-3.5 py-3 text-xs text-ink-400 dark:border-ink-800 dark:bg-ink-900">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading poll…
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="rounded-2xl bg-ink-100 px-3.5 py-2 text-sm text-ink-800 dark:bg-ink-800 dark:text-ink-100">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-500 dark:text-ink-400">
          <BarChart3 className="h-3.5 w-3.5" /> Poll
        </p>
        <p className="mt-0.5 text-xs text-ink-400 dark:text-ink-500">Poll voting isn’t available yet.</p>
      </div>
    );
  }

  const hasVoted = poll.myVoteIndex !== null && poll.myVoteIndex !== undefined;

  async function handleVote(index: number) {
    if (hasVoted || vote.isPending) return;
    setError(null);
    try {
      await vote.mutateAsync({ pollId, optionIndex: index });
    } catch {
      setError('Vote failed to record. Try again.');
    }
  }

  return (
    <div className="rounded-2xl border border-ink-100 bg-white px-3.5 py-3 dark:border-ink-800 dark:bg-ink-900">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-500 dark:text-ink-400">
        <BarChart3 className="h-3.5 w-3.5" /> Poll
      </p>
      <p className="mt-1 text-sm font-semibold text-ink-900 dark:text-white">{poll.question}</p>
      <div className="mt-2.5 space-y-2">
        {poll.options.map((opt, i) => {
          const pct = poll.totalVotes > 0 ? Math.round((opt.voteCount / poll.totalVotes) * 100) : 0;
          const isMine = poll.myVoteIndex === i;
          return (
            <button
              key={i}
              type="button"
              disabled={hasVoted || vote.isPending}
              onClick={() => handleVote(i)}
              className={`relative block w-full overflow-hidden rounded-lg border px-2.5 py-1.5 text-left text-xs disabled:cursor-default ${
                isMine ? 'border-brand-400 bg-brand-50 dark:border-brand-500/50 dark:bg-brand-500/10' : 'border-ink-200 hover:enabled:bg-ink-50 dark:border-ink-700 dark:hover:enabled:bg-ink-800'
              }`}
            >
              {hasVoted && <span className="absolute inset-y-0 left-0 bg-brand-100 dark:bg-brand-500/20" style={{ width: `${pct}%` }} aria-hidden />}
              <span className="relative flex items-center justify-between gap-2">
                <span className="font-medium text-ink-800 dark:text-ink-100">{opt.text}</span>
                {hasVoted && (
                  <span className="shrink-0 text-[11px] text-ink-500 dark:text-ink-400">
                    {opt.voteCount} · {pct}%
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] text-ink-400 dark:text-ink-500">
        {poll.totalVotes} vote{poll.totalVotes === 1 ? '' : 's'}
        {poll.closesAt ? ` · closes ${new Date(poll.closesAt).toLocaleDateString()}` : ''}
      </p>
      {error && <p className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}
