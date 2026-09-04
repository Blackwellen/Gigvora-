'use client';

import { useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Clock3, CornerDownRight, Loader2, MoreHorizontal, Repeat2, X } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Popover, PopoverTrigger, PopoverContent, usePopoverClose } from '@/components/ui/Popover';
import { Button } from '@/components/ui/Button';
import { EmojiPickerButton } from '@/components/chat-bubble/EmojiPickerButton';
import { GifPickerButton } from './GifPickerButton';
import { VoiceNoteButton } from './VoiceNoteButton';
import { ReportModal } from './ReportModal';
import {
  useComments,
  useCreateComment,
  useReactToComment,
  useRemoveCommentReaction,
  useShareComment,
  useUploadCommentAttachment,
  type CommentData,
  type CommentAttachment,
  type GifResult,
} from '@/hooks/useFeed';
import { useSession } from '@/lib/session/SessionContext';
import { getApiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';

const REACTIONS: Array<{ key: string; emoji: string; label: string }> = [
  { key: 'like', emoji: '👍', label: 'Like' },
  { key: 'celebrate', emoji: '🎉', label: 'Celebrate' },
  { key: 'support', emoji: '🤝', label: 'Support' },
  { key: 'love', emoji: '❤️', label: 'Love' },
  { key: 'insightful', emoji: '💡', label: 'Insightful' },
  { key: 'curious', emoji: '🤔', label: 'Curious' },
];

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

function CommentAttachmentView({ attachment }: { attachment: CommentAttachment }) {
  if (attachment.type === 'audio') {
    return (
      <audio controls src={attachment.url} className="mt-1.5 h-9 w-full max-w-[280px]">
        Your browser doesn&apos;t support audio playback.
      </audio>
    );
  }
  // image and gif both render the same way — a gif is just an animated image URL.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={attachment.url}
      alt=""
      className="mt-1.5 max-h-56 rounded-lg object-contain"
      style={attachment.width && attachment.height ? { aspectRatio: `${attachment.width} / ${attachment.height}` } : undefined}
    />
  );
}

function CommentReactionButton({ postId, comment }: { postId: string; comment: CommentData }) {
  const react = useReactToComment(postId, comment.parentCommentId);
  const unreact = useRemoveCommentReaction(postId, comment.parentCommentId);

  function toggle() {
    if (comment.viewerReaction) unreact.mutate({ commentId: comment.id });
    else react.mutate({ commentId: comment.id, reactionType: 'like' });
  }

  return (
    <Popover>
      <PopoverTrigger>
        <button
          type="button"
          onClick={toggle}
          aria-pressed={Boolean(comment.viewerReaction)}
          className={cn('flex items-center gap-1 font-semibold', comment.viewerReaction ? 'text-brand-600' : 'hover:text-ink-600 dark:hover:text-ink-300')}
        >
          {comment.viewerReaction ? REACTIONS.find((r) => r.key === comment.viewerReaction)?.emoji : 'Like'}
          {comment.reactionCount > 0 && <span className="text-ink-400 dark:text-ink-500">{comment.reactionCount}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent width="w-auto" align="start" className="flex gap-1 p-1.5">
        {REACTIONS.map((r) => (
          <button
            key={r.key}
            type="button"
            title={r.label}
            aria-label={r.label}
            onClick={() => react.mutate({ commentId: comment.id, reactionType: r.key })}
            className="rounded-lg p-1.5 text-base transition-transform hover:scale-125 hover:bg-ink-50 dark:hover:bg-ink-800"
          >
            <span aria-hidden>{r.emoji}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function CommentMenu({ commentId }: { commentId: string }) {
  const close = usePopoverClose();
  const [reportOpen, setReportOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <>
      <Popover>
        <PopoverTrigger>
          <button type="button" aria-label="More options" className="rounded-md p-1 text-ink-300 hover:bg-ink-100 hover:text-ink-500 dark:hover:bg-ink-800">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent width="w-44">
          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                setShareOpen(true);
                close();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink-700 dark:text-ink-200 hover:bg-ink-50 dark:hover:bg-ink-800"
            >
              <Repeat2 className="h-3.5 w-3.5" /> Share comment
            </button>
            <button
              type="button"
              onClick={() => {
                setReportOpen(true);
                close();
              }}
              className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-ink-700 dark:text-ink-200 hover:bg-ink-50 dark:hover:bg-ink-800"
            >
              Report comment
            </button>
          </div>
        </PopoverContent>
      </Popover>
      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} objectType="comment" objectId={commentId} />
      {shareOpen && <ShareCommentModal commentId={commentId} onClose={() => setShareOpen(false)} />}
    </>
  );
}

function ShareCommentModal({ commentId, onClose }: { commentId: string; onClose: () => void }) {
  const [note, setNote] = useState('');
  const [done, setDone] = useState(false);
  const share = useShareComment();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-950/50 px-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-overlay border border-ink-100 bg-white p-4 shadow-floating dark:border-ink-800 dark:bg-ink-900" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between">
          <p className="font-display text-sm font-bold text-ink-900 dark:text-white">Share comment</p>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800">
            <X className="h-4 w-4" />
          </button>
        </div>
        {done ? (
          <p className="py-3 text-sm text-ink-600 dark:text-ink-300">Shared to your timeline as a new post.</p>
        ) : (
          <>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add your thoughts (optional)"
              rows={3}
              className="w-full rounded-control border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
            />
            <Button
              type="button"
              size="sm"
              className="mt-3 w-full"
              disabled={share.isPending}
              onClick={async () => {
                await share.mutateAsync({ commentId, comment: note.trim() || undefined });
                setDone(true);
              }}
            >
              {share.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Share to your timeline
            </Button>
          </>
        )}
      </div>
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
        <div className="flex items-start justify-between gap-2 rounded-2xl bg-ink-50 dark:bg-ink-800 px-3 py-2">
          <div className="min-w-0 flex-1">
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
            {comment.body && <p className="text-sm text-ink-700 dark:text-ink-200">{comment.body}</p>}
            {comment.attachments?.[0] && <CommentAttachmentView attachment={comment.attachments[0]} />}
          </div>
          <CommentMenu commentId={comment.id} />
        </div>
        {comment.pendingReview && (
          <p className="mt-1 px-1 text-xs text-amber-700 dark:text-amber-400">
            This comment is only visible to you while it's under review.
          </p>
        )}
        <div className="mt-1 flex items-center gap-3 px-1 text-xs text-ink-400 dark:text-ink-500">
          <span>{formatDistanceToNowStrict(new Date(comment.createdAt), { addSuffix: true })}</span>
          <CommentReactionButton postId={postId} comment={comment} />
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
                  <div className="flex items-start justify-between gap-2 rounded-2xl bg-ink-50 dark:bg-ink-800 px-3 py-1.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-ink-900 dark:text-white">{reply.author?.name}</p>
                      {reply.body && <p className="text-sm text-ink-700 dark:text-ink-200">{reply.body}</p>}
                      {reply.attachments?.[0] && <CommentAttachmentView attachment={reply.attachments[0]} />}
                    </div>
                    <CommentMenu commentId={reply.id} />
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 px-1 text-[11px] text-ink-400 dark:text-ink-500">
                    <span>{formatDistanceToNowStrict(new Date(reply.createdAt), { addSuffix: true })}</span>
                    <CommentReactionButton postId={postId} comment={reply} />
                  </div>
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
  const [pendingAttachment, setPendingAttachment] = useState<CommentAttachment | null>(null);
  const [pendingNotice, setPendingNotice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createComment = useCreateComment(postId);
  const uploadAttachment = useUploadCommentAttachment();
  const noticeId = parentCommentId ? `reply-pending-notice-${parentCommentId}` : `comment-pending-notice-${postId}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim() && !pendingAttachment) return;
    setError(null);
    try {
      const result = await createComment.mutateAsync({ body: value, parentCommentId, attachments: pendingAttachment ? [pendingAttachment] : [] });
      setValue('');
      setPendingAttachment(null);
      setPendingNotice(result.pendingReview === true || result.status === 'under_review');
      onDone?.();
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't post comment."));
    }
  }

  async function handleVoiceNote(blob: Blob, durationSeconds: number) {
    setError(null);
    try {
      const file = new File([blob], `voice-note.${blob.type.includes('webm') ? 'webm' : 'mp4'}`, { type: blob.type });
      const uploaded = await uploadAttachment.mutateAsync(file);
      setPendingAttachment({ type: 'audio', url: uploaded.url, durationSeconds });
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't upload voice note."));
    }
  }

  function handleGif(gif: GifResult) {
    setPendingAttachment({ type: 'gif', url: gif.url, width: gif.width, height: gif.height, provider: gif.provider, providerId: gif.id });
  }

  const fullName = user ? [user.first_name, user.last_name].filter(Boolean).join(' ') : '';

  return (
    <div>
      <form onSubmit={submit} className="flex items-start gap-2.5">
        <Avatar src={user?.avatarUrl} name={fullName} size={compact ? 'xs' : 'sm'} />
        <div className="min-w-0 flex-1 rounded-2xl border border-ink-100 dark:border-ink-800 bg-white dark:bg-ink-900">
          <div className="flex items-center gap-2 pl-3 pr-1.5">
            <input
              id={parentCommentId ? `reply-input-${parentCommentId}` : `comment-input-${postId}`}
              name="comment"
              autoFocus={autoFocus}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={parentCommentId ? 'Write a reply...' : 'Add a comment...'}
              aria-label={parentCommentId ? 'Write a reply' : 'Add a comment'}
              aria-describedby={pendingNotice ? noticeId : undefined}
              className="h-9 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-400 dark:placeholder:text-ink-500"
            />
            <EmojiPickerButton onSelect={(emoji) => setValue((v) => v + emoji)} />
            <GifPickerButton onSelect={handleGif} />
            <VoiceNoteButton onRecorded={handleVoiceNote} uploading={uploadAttachment.isPending} />
            <button
              type="submit"
              disabled={(!value.trim() && !pendingAttachment) || createComment.isPending}
              className="rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
            >
              {parentCommentId ? 'Reply' : 'Post'}
            </button>
          </div>
          {pendingAttachment && (
            <div className="relative border-t border-ink-100 px-3 py-2 dark:border-ink-800">
              <button
                type="button"
                onClick={() => setPendingAttachment(null)}
                aria-label="Remove attachment"
                className="absolute right-2 top-2 rounded-full bg-ink-900/60 p-0.5 text-white hover:bg-ink-900"
              >
                <X className="h-3 w-3" />
              </button>
              <CommentAttachmentView attachment={pendingAttachment} />
            </div>
          )}
        </div>
      </form>
      {error && <p className="mt-1.5 pl-10 text-xs font-medium text-red-600">{error}</p>}
      {pendingNotice && (
        <p id={noticeId} role="status" aria-live="polite" className="mt-1.5 pl-10 text-xs text-amber-700 dark:text-amber-400">
          Posted — it's pending review and only visible to you until an admin approves it.
        </p>
      )}
    </div>
  );
}
