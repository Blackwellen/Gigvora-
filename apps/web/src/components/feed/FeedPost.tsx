'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNowStrict } from 'date-fns';
import { MoreHorizontal, Globe, Users, Lock, FileText, Pin, Trash2, Repeat2, ShieldAlert } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Popover, PopoverTrigger, PopoverContent, usePopoverClose } from '@/components/ui/Popover';
import { ReactionBar } from './ReactionBar';
import { CommentThread } from './CommentThread';
import { PostShareMenu } from './PostShareMenu';
import { ReportModal } from './ReportModal';
import { useDeletePost, useVotePoll, useNotInterested, useHideAuthor, useHideTopic, type FeedPostData } from '@/hooks/useFeed';
import { usePostRealtimeReconciliation } from '@/hooks/useFeedSocket';
import { getApiErrorMessage } from '@/lib/api';
import { useSession } from '@/lib/session/SessionContext';
import { cn } from '@/lib/cn';

const VISIBILITY_ICON = { public: Globe, connections: Users, private: Lock };

export function FeedPost({ post, defaultCommentsOpen = false }: { post: FeedPostData; defaultCommentsOpen?: boolean }) {
  const [commentsOpen, setCommentsOpen] = useState(defaultCommentsOpen);
  const [shareOpen, setShareOpen] = useState(false);
  const { user } = useSession();
  const isAuthor = user?.id === post.authorId;
  const VisibilityIcon = VISIBILITY_ICON[post.visibility];

  // Joins `post:${post.id}` while this card is mounted (feed list item or
  // post detail) and reconciles live reaction/comment/poll updates into the
  // React Query cache — see useFeedSocket.ts for the merge logic.
  usePostRealtimeReconciliation(post.id);

  return (
    <article className="rounded-2xl border border-ink-100 dark:border-ink-800 bg-white dark:bg-ink-900 p-4 shadow-surface" aria-label={`Post by ${post.author?.name}`}>
      {post.isPinned && (
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink-400 dark:text-ink-500">
          <Pin className="h-3 w-3" /> Pinned
        </p>
      )}

      {post.status === 'under_review' && isAuthor && (
        <p
          role="status"
          className="mb-3 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
        >
          <ShieldAlert className="h-3.5 w-3.5 shrink-0" /> Your post is under review and is only visible to you until a moderator approves it.
        </p>
      )}

      <header className="flex items-start justify-between">
        <div className="flex gap-3">
          <Link href={`/profile/${post.authorId}`}>
            <Avatar name={post.author?.name || 'Unknown'} size="md" />
          </Link>
          <div>
            <Link href={`/profile/${post.authorId}`} className="text-sm font-bold text-ink-900 dark:text-white hover:underline">
              {post.author?.name}
            </Link>
            {post.author?.headline && <p className="text-xs text-ink-500 dark:text-ink-400">{post.author.headline}</p>}
            <p className="flex items-center gap-1 text-xs text-ink-400 dark:text-ink-500">
              {formatDistanceToNowStrict(new Date(post.createdAt), { addSuffix: true })}
              {post.editedAt && <span>· Edited</span>}
              <span aria-hidden>·</span>
              <VisibilityIcon className="h-3 w-3" />
            </p>
          </div>
        </div>
        <PostOverflowMenu post={post} />
      </header>

      {post.sharedFromPostId && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-ink-400 dark:text-ink-500">
          <Repeat2 className="h-3.5 w-3.5" /> Reposted
        </p>
      )}

      {post.body && <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-800 dark:text-ink-100">{post.body}</p>}

      {post.attachments.length > 0 && <AttachmentGrid attachments={post.attachments} />}

      {post.poll && <PollCard postId={post.id} poll={post.poll} />}

      <div className="mt-3 flex items-center justify-between text-xs text-ink-400 dark:text-ink-500" aria-live="polite">
        <span>{post.likeCount > 0 && `${post.likeCount} reaction${post.likeCount === 1 ? '' : 's'}`}</span>
        <span className="flex gap-3">
          {post.commentCount > 0 && (
            <button type="button" onClick={() => setCommentsOpen(true)} className="hover:underline">
              {post.commentCount} comment{post.commentCount === 1 ? '' : 's'}
            </button>
          )}
          {post.shareCount > 0 && <span>{post.shareCount} share{post.shareCount === 1 ? '' : 's'}</span>}
        </span>
      </div>

      <div className="mt-1">
        <ReactionBar
          postId={post.id}
          myReaction={post.myReaction}
          likeCount={post.likeCount}
          commentCount={post.commentCount}
          shareCount={post.shareCount}
          isSaved={post.isSaved}
          onToggleComments={() => setCommentsOpen((v) => !v)}
          onShare={() => setShareOpen(true)}
        />
      </div>

      {commentsOpen && (
        <div className="mt-3">
          <CommentThread postId={post.id} />
        </div>
      )}

      <PostShareMenu postId={post.id} open={shareOpen} onClose={() => setShareOpen(false)} />
    </article>
  );
}

function AttachmentGrid({ attachments }: { attachments: FeedPostData['attachments'] }) {
  return (
    <div className={cn('mt-3 grid gap-1 overflow-hidden rounded-xl', attachments.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
      {attachments.map((a, idx) =>
        a.type === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={idx} src={a.url} alt={a.fileName || 'Post attachment'} className="max-h-[420px] w-full object-cover" />
        ) : a.type === 'video' ? (
          <video key={idx} src={a.url} controls className="max-h-[420px] w-full bg-black" />
        ) : (
          <a
            key={idx}
            href={a.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 border border-ink-100 dark:border-ink-800 bg-ink-50 dark:bg-ink-800 p-3 hover:bg-ink-100 dark:hover:bg-ink-800"
          >
            <FileText className="h-8 w-8 shrink-0 text-ink-400 dark:text-ink-500" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-ink-800 dark:text-ink-100">{a.fileName}</span>
              {a.fileSize && <span className="block text-xs text-ink-500 dark:text-ink-400">{(a.fileSize / 1024).toFixed(0)} KB</span>}
            </span>
          </a>
        )
      )}
    </div>
  );
}

function PollCard({ postId, poll }: { postId: string; poll: NonNullable<FeedPostData['poll']> }) {
  const votePoll = useVotePoll();
  const hasVoted = poll.myVotes.length > 0;

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-ink-100 dark:border-ink-800 p-3">
      <p className="text-sm font-semibold text-ink-900 dark:text-white">{poll.question}</p>
      {poll.options.map((option) => {
        const pct = poll.totalVotes ? Math.round((option.voteCount / poll.totalVotes) * 100) : 0;
        const mine = poll.myVotes.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            disabled={votePoll.isPending}
            onClick={() => votePoll.mutate({ pollId: poll.id, optionIds: [option.id] })}
            aria-pressed={mine}
            aria-label={`${option.label}${hasVoted ? `, ${pct}% of votes${mine ? ', your vote' : ''}` : ''}`}
            className="relative block w-full overflow-hidden rounded-lg border border-ink-100 dark:border-ink-800 text-left"
          >
            {hasVoted && <span className="absolute inset-y-0 left-0 bg-brand-50" style={{ width: `${pct}%` }} aria-hidden />}
            <span className="relative flex items-center justify-between px-3 py-2 text-sm">
              <span className={cn('font-medium', mine ? 'text-brand-700' : 'text-ink-800')}>{option.label}</span>
              {hasVoted && (
                <span className="text-xs font-semibold text-ink-500 dark:text-ink-400">
                  {pct}% {mine && '· You voted'}
                </span>
              )}
            </span>
          </button>
        );
      })}
      <p className="text-xs text-ink-400 dark:text-ink-500">{poll.totalVotes} vote{poll.totalVotes === 1 ? '' : 's'}</p>
    </div>
  );
}

function PostOverflowMenu({ post }: { post: FeedPostData }) {
  const { user } = useSession();
  const deletePost = useDeletePost();
  const isAuthor = user?.id === post.authorId;

  return (
    <Popover>
      <PopoverTrigger>
        <button type="button" aria-label="More options" className="rounded-lg p-1.5 text-ink-400 dark:text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800">
          <MoreHorizontal className="h-4.5 w-4.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent width="w-52">
        <MenuActions post={post} isAuthor={isAuthor} onDelete={() => deletePost.mutate({ postId: post.id })} />
      </PopoverContent>
    </Popover>
  );
}

function MenuActions({ post, isAuthor, onDelete }: { post: FeedPostData; isAuthor: boolean; onDelete: () => void }) {
  const close = usePopoverClose();
  const notInterested = useNotInterested();
  const hideAuthor = useHideAuthor();
  const hideTopic = useHideTopic();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <div className="py-1">
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(`${window.location.origin}/app/post-detail/${post.id}`);
          close();
        }}
        className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-ink-700 dark:text-ink-200 hover:bg-ink-50 dark:hover:bg-ink-800"
      >
        Copy link
      </button>

      {isAuthor && (
        <Link
          href={`/app/edit-post/${post.id}`}
          onClick={close}
          className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-ink-700 dark:text-ink-200 hover:bg-ink-50 dark:hover:bg-ink-800"
        >
          Edit post
        </Link>
      )}

      {isAuthor && (
        <Link
          href={`/app/post-analytics/${post.id}`}
          onClick={close}
          className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-ink-700 dark:text-ink-200 hover:bg-ink-50 dark:hover:bg-ink-800"
        >
          View analytics
        </Link>
      )}

      {isAuthor && (
        <button
          type="button"
          onClick={() => {
            onDelete();
            close();
          }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete post
        </button>
      )}

      {!isAuthor && (
        <>
          <button
            type="button"
            disabled={notInterested.isPending}
            onClick={async () => {
              try {
                await notInterested.mutateAsync(post.id);
                close();
              } catch (err) {
                setFeedback(getApiErrorMessage(err, 'Could not update preference.'));
              }
            }}
            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-ink-700 dark:text-ink-200 hover:bg-ink-50 dark:hover:bg-ink-800 disabled:opacity-60"
          >
            Not interested
          </button>
          <button
            type="button"
            disabled={hideAuthor.isPending}
            onClick={async () => {
              try {
                await hideAuthor.mutateAsync(post.authorId);
                close();
              } catch (err) {
                setFeedback(getApiErrorMessage(err, 'Could not update preference.'));
              }
            }}
            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-ink-700 dark:text-ink-200 hover:bg-ink-50 dark:hover:bg-ink-800 disabled:opacity-60"
          >
            Hide posts from {post.author?.name || 'this person'}
          </button>
          {post.topics.slice(0, 2).map((topic) => (
            <button
              key={topic}
              type="button"
              disabled={hideTopic.isPending}
              onClick={async () => {
                try {
                  await hideTopic.mutateAsync(topic);
                  close();
                } catch (err) {
                  setFeedback(getApiErrorMessage(err, 'Could not update preference.'));
                }
              }}
              className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-ink-700 dark:text-ink-200 hover:bg-ink-50 dark:hover:bg-ink-800 disabled:opacity-60"
            >
              Hide topic: #{topic}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setReportOpen(true);
              close();
            }}
            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-ink-700 dark:text-ink-200 hover:bg-ink-50 dark:hover:bg-ink-800"
          >
            Report post
          </button>
        </>
      )}

      {feedback && <p className="px-3 py-1.5 text-xs text-red-600">{feedback}</p>}
      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} objectType="post" objectId={post.id} />
    </div>
  );
}
