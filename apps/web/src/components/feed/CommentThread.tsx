'use client';

import { useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Clock3, CornerDownRight, Loader2 } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { useComments, useCreateComment, type CommentData } from '@/hooks/useFeed';
import { useSession } from '@/lib/session/SessionContext';

export function CommentThread({ postId }: { postId: string }) {
  const { data: comments, isLoading } = useComments(postId);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  return (
    <div className="space-y-3 border-t border-ink-100 dark:border-ink-800 pt-3">
      <ComposerRow postId={postId} parentCommentId={null} />
      {isLoading && (
        <div className="flex justify-center py-2">
          <Loader2 className="h-4 w-4 animate-spin text-ink-300" />
        </div>
      )}
      {comments?.map((comment) => (
        <CommentRow key={comment.id} postId={postId} comment={comment} replyingTo={replyingTo} setReplyingTo={setReplyingTo} />
      ))}
    </div>
  );
}

function CommentRow({
  postId,
  comment,
  replyingTo,
  setReplyingTo,
}: {
  postId: string;
  comment: CommentData;
  replyingTo: string | null;
  setReplyingTo: (id: string | null) => void;
}) {
  const [showReplies, setShowReplies] = useState(false);
  const { data: replies } = useComments(postId, comment.id, showReplies);

  return (
    <div className="flex gap-2.5">
      <Avatar name={comment.author?.name || 'Unknown'} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl bg-ink-50 dark:bg-ink-800 px-3 py-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-sm font-semibold text-ink-900 dark:text-white">{comment.author?.name}</p>
            {comment.pendingReview && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                title="Only visible to you until an admin reviews it"
              >
                <Clock3 className="h-3 w-3" aria-hidden />
                Pending review
              </span>
            )}
          </div>
          <p className="text-sm text-ink-700 dark:text-ink-200">{comment.body}</p>
        </div>
        {comment.pendingReview && (
          <p className="mt-1 px-1 text-xs text-amber-700 dark:text-amber-400">
            This comment is only visible to you while it's under review.
          </p>
        )}
        <div className="mt-1 flex items-center gap-3 px-1 text-xs text-ink-400 dark:text-ink-500">
          <span>{formatDistanceToNowStrict(new Date(comment.createdAt), { addSuffix: true })}</span>
          <button type="button" onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)} className="font-semibold hover:text-ink-600 dark:hover:text-ink-300">
            Reply
          </button>
          {comment.replyCount > 0 && (
            <button type="button" onClick={() => setShowReplies((v) => !v)} className="flex items-center gap-1 font-semibold hover:text-ink-600 dark:hover:text-ink-300">
              <CornerDownRight className="h-3 w-3" /> {showReplies ? 'Hide' : `View ${comment.replyCount}`} {comment.replyCount === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>

        {replyingTo === comment.id && (
          <div className="mt-2">
            <ComposerRow postId={postId} parentCommentId={comment.id} onDone={() => setReplyingTo(null)} autoFocus compact />
          </div>
        )}

        {showReplies && replies && (
          <div className="mt-2 space-y-2 border-l-2 border-ink-100 dark:border-ink-800 pl-3">
            {replies.map((reply) => (
              <div key={reply.id} className="flex gap-2">
                <Avatar name={reply.author?.name || 'Unknown'} size="xs" />
                <div className="min-w-0 flex-1">
                  <div className="rounded-2xl bg-ink-50 dark:bg-ink-800 px-3 py-1.5">
                    <p className="text-xs font-semibold text-ink-900 dark:text-white">{reply.author?.name}</p>
                    <p className="text-sm text-ink-700 dark:text-ink-200">{reply.body}</p>
                  </div>
                  <p className="mt-0.5 px-1 text-[11px] text-ink-400 dark:text-ink-500">{formatDistanceToNowStrict(new Date(reply.createdAt), { addSuffix: true })}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ComposerRow({
  postId,
  parentCommentId,
  onDone,
  autoFocus,
  compact,
}: {
  postId: string;
  parentCommentId: string | null;
  onDone?: () => void;
  autoFocus?: boolean;
  compact?: boolean;
}) {
  const { user } = useSession();
  const [value, setValue] = useState('');
  const [pendingNotice, setPendingNotice] = useState(false);
  const createComment = useCreateComment(postId);
  const noticeId = parentCommentId ? `reply-pending-notice-${parentCommentId}` : `comment-pending-notice-${postId}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    const result = await createComment.mutateAsync({ body: value, parentCommentId });
    setValue('');
    setPendingNotice(result.pendingReview === true || result.status === 'under_review');
    onDone?.();
  }

  const fullName = user ? [user.first_name, user.last_name].filter(Boolean).join(' ') : '';

  return (
    <div>
      <form onSubmit={submit} className="flex items-center gap-2.5">
        <Avatar src={user?.avatarUrl} name={fullName} size={compact ? 'xs' : 'sm'} />
        <div className="flex flex-1 items-center gap-2 rounded-full border border-ink-100 dark:border-ink-800 bg-white dark:bg-ink-900 pl-3 pr-1.5">
          <input
            id={parentCommentId ? `reply-input-${parentCommentId}` : `comment-input-${postId}`}
            name="comment"
            autoFocus={autoFocus}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={parentCommentId ? 'Write a reply...' : 'Add a comment...'}
            aria-label={parentCommentId ? 'Write a reply' : 'Add a comment'}
            aria-describedby={pendingNotice ? noticeId : undefined}
            className="h-8 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-400 dark:placeholder:text-ink-500"
          />
          <button
            type="submit"
            disabled={!value.trim() || createComment.isPending}
            className="rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
          >
            {parentCommentId ? 'Reply' : 'Post'}
          </button>
        </div>
      </form>
      {pendingNotice && (
        <p id={noticeId} role="status" aria-live="polite" className="mt-1.5 pl-10 text-xs text-amber-700 dark:text-amber-400">
          Posted — it's pending review and only visible to you until an admin approves it.
        </p>
      )}
    </div>
  );
}
