'use client';

import { ThumbsUp, MessageCircle, Repeat2, Bookmark } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent, usePopoverClose } from '@/components/ui/Popover';
import { useReactToPost, useRemoveReaction, useSavePost } from '@/hooks/useFeed';
import { cn } from '@/lib/cn';

const REACTIONS: Array<{ key: string; emoji: string; label: string }> = [
  { key: 'like', emoji: '👍', label: 'Like' },
  { key: 'celebrate', emoji: '🎉', label: 'Celebrate' },
  { key: 'support', emoji: '🤝', label: 'Support' },
  { key: 'love', emoji: '❤️', label: 'Love' },
  { key: 'insightful', emoji: '💡', label: 'Insightful' },
  { key: 'curious', emoji: '🤔', label: 'Curious' },
];

export function ReactionBar({
  postId,
  myReaction,
  likeCount,
  commentCount,
  shareCount,
  isSaved,
  onToggleComments,
  onShare,
}: {
  postId: string;
  myReaction: string | null;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  isSaved: boolean;
  onToggleComments: () => void;
  onShare: () => void;
}) {
  const react = useReactToPost();
  const unreact = useRemoveReaction();
  const save = useSavePost();

  function toggleLike() {
    if (myReaction) unreact.mutate({ postId });
    else react.mutate({ postId, reactionType: 'like' });
  }

  return (
    <div className="flex items-center justify-between border-t border-ink-100 dark:border-ink-800 pt-1">
      <Popover>
        <PopoverTrigger>
          <button
            type="button"
            onClick={toggleLike}
            aria-pressed={Boolean(myReaction)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold',
              myReaction ? 'text-brand-600' : 'text-ink-500 hover:bg-ink-100'
            )}
          >
            {myReaction ? REACTIONS.find((r) => r.key === myReaction)?.emoji : <ThumbsUp className="h-4 w-4" aria-hidden />}
            {myReaction ? REACTIONS.find((r) => r.key === myReaction)?.label : 'Like'}
            {likeCount > 0 && <span className="text-ink-400 dark:text-ink-500">{likeCount}</span>}
          </button>
        </PopoverTrigger>
        <PopoverContent width="w-auto" align="start" className="flex gap-1 p-1.5">
          <ReactionPicker postId={postId} />
        </PopoverContent>
      </Popover>

      <button type="button" onClick={onToggleComments} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-ink-500 dark:text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800">
        <MessageCircle className="h-4 w-4" aria-hidden /> Comment {commentCount > 0 && <span className="text-ink-400 dark:text-ink-500">{commentCount}</span>}
      </button>

      <button type="button" onClick={onShare} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-ink-500 dark:text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800">
        <Repeat2 className="h-4 w-4" aria-hidden /> Share {shareCount > 0 && <span className="text-ink-400 dark:text-ink-500">{shareCount}</span>}
      </button>

      <button
        type="button"
        onClick={() => save.mutate({ postId, save: !isSaved })}
        aria-pressed={isSaved}
        aria-label={isSaved ? 'Remove from saved items' : 'Save this post'}
        className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold', isSaved ? 'text-brand-600' : 'text-ink-500 hover:bg-ink-100')}
      >
        <Bookmark className={cn('h-4 w-4', isSaved && 'fill-brand-500')} aria-hidden /> Save
      </button>
    </div>
  );
}

function ReactionPicker({ postId }: { postId: string }) {
  const react = useReactToPost();
  const close = usePopoverClose();
  return (
    <>
      {REACTIONS.map((r) => (
        <button
          key={r.key}
          type="button"
          title={r.label}
          aria-label={r.label}
          onClick={() => {
            react.mutate({ postId, reactionType: r.key });
            close();
          }}
          className="rounded-lg p-1.5 text-lg transition-transform hover:scale-125 hover:bg-ink-50 dark:hover:bg-ink-800"
        >
          <span aria-hidden>{r.emoji}</span>
        </button>
      ))}
    </>
  );
}
