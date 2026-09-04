'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { ArrowLeft, Loader2, Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ReactionBar } from '@/components/feed/ReactionBar';
import { CommentThread } from '@/components/feed/CommentThread';
import { PostShareMenu } from '@/components/feed/PostShareMenu';
import { ContentBlockRenderer, extractHeadings } from '@/components/feed/ContentBlockRenderer';
import { useArticle, useRelatedArticles, type ArticleData } from '@/hooks/useArticles';
import { useFollowStatus, useFollowUser, useUnfollowUser } from '@/hooks/useFollow';
import { useSession } from '@/lib/session/SessionContext';
import { getApiErrorMessage } from '@/lib/api';

export default function ArticleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: article, isLoading, isError, error } = useArticle(id);
  const [commentsOpen, setCommentsOpen] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <div className="mx-auto grid max-w-[1320px] grid-cols-1 gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-6">
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
            / <span className="text-ink-600 dark:text-ink-300">Article Detail</span>
          </nav>
        </div>

        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        )}

        {isError && (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-white dark:border-ink-700 dark:bg-ink-900 py-16 text-center">
            <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Article not found</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error, "This article doesn't exist or you don't have access to it.")}</p>
          </div>
        )}

        {article && (
          <>
            {article.topics.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {article.topics.map((topic) => (
                  <Link
                    key={topic}
                    href={`/app/hashtag/${encodeURIComponent(topic)}`}
                    className="rounded-full bg-brand-50 dark:bg-brand-500/15 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-500/25"
                  >
                    #{topic}
                  </Link>
                ))}
              </div>
            )}

            <h1 className="font-display text-2xl font-bold tracking-[-0.01em] text-ink-900 dark:text-white">{article.article.title}</h1>
            {article.article.subtitle && <p className="text-base text-ink-500 dark:text-ink-400">{article.article.subtitle}</p>}

            <ArticleByline article={article} onShare={() => setShareOpen(true)} />

            {article.article.coverImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={article.article.coverImageUrl} alt={article.article.title} className="w-full rounded-2xl border border-ink-100 dark:border-ink-800 object-cover" />
            )}

            <Card className="p-5">
              <ContentBlockRenderer blocks={article.article.contentJson} />
            </Card>

            <Card className="p-4">
              <div className="mb-1">
                <ReactionBar
                  postId={article.id}
                  myReaction={article.myReaction}
                  likeCount={article.likeCount}
                  commentCount={article.commentCount}
                  shareCount={article.shareCount}
                  isSaved={article.isSaved}
                  onToggleComments={() => setCommentsOpen((v) => !v)}
                  onShare={() => setShareOpen(true)}
                />
              </div>
              {commentsOpen && (
                <div className="mt-3">
                  <CommentThread postId={article.id} />
                </div>
              )}
            </Card>

            <PostShareMenu postId={article.id} open={shareOpen} onClose={() => setShareOpen(false)} />
          </>
        )}
      </main>

      {article && (
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-4">
            <ArticleInsightsCard article={article} />
            <AboutAuthorCard authorId={article.authorId} authorName={article.author?.name || 'Unknown'} authorHeadline={article.author?.headline || null} />
            <TableOfContentsCard article={article} />
            <RelatedArticlesCard postId={article.id} />
          </div>
        </aside>
      )}
    </div>
  );
}

function ArticleByline({ article, onShare }: { article: ArticleData; onShare: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Link href={`/profile/${article.authorId}`}>
          <Avatar name={article.author?.name || 'Unknown'} size="md" />
        </Link>
        <div>
          <Link href={`/profile/${article.authorId}`} className="text-sm font-bold text-ink-900 dark:text-white hover:underline">
            {article.author?.name}
          </Link>
          {article.author?.headline && <p className="text-xs text-ink-500 dark:text-ink-400">{article.author.headline}</p>}
          <p className="flex items-center gap-1 text-xs text-ink-400 dark:text-ink-500">
            {format(new Date(article.createdAt), 'MMM d, yyyy')}
            {article.editedAt && <span>· Updated {format(new Date(article.editedAt), 'MMM d, yyyy')}</span>}
            <span aria-hidden>·</span>
            <Clock className="h-3 w-3" /> {article.article.readingTimeMinutes} min read
          </p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onShare}>
        Share
      </Button>
    </div>
  );
}

function ArticleInsightsCard({ article }: { article: ArticleData }) {
  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-bold text-ink-900 dark:text-white">Article insights</h3>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-lg font-bold text-ink-900 dark:text-white">{article.likeCount}</p>
          <p className="text-xs text-ink-500 dark:text-ink-400">Reactions</p>
        </div>
        <div>
          <p className="text-lg font-bold text-ink-900 dark:text-white">{article.commentCount}</p>
          <p className="text-xs text-ink-500 dark:text-ink-400">Comments</p>
        </div>
        <div>
          <p className="text-lg font-bold text-ink-900 dark:text-white">{article.shareCount}</p>
          <p className="text-xs text-ink-500 dark:text-ink-400">Shares</p>
        </div>
      </div>
      {/* Views / reads / engagement-rate / AI summary omitted — no
          impression- or read-tracking table backs those numbers. */}
    </Card>
  );
}

function AboutAuthorCard({ authorId, authorName, authorHeadline }: { authorId: string; authorName: string; authorHeadline: string | null }) {
  const { user } = useSession();
  const isSelf = user?.id === authorId;
  const { data: followStatus, isLoading } = useFollowStatus(authorId, !isSelf);
  const follow = useFollowUser();
  const unfollow = useUnfollowUser();
  const isFollowing = followStatus?.following ?? false;
  const pending = follow.isPending || unfollow.isPending;

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-bold text-ink-900 dark:text-white">About the author</h3>
      <div className="flex items-center gap-3">
        <Link href={`/profile/${authorId}`}>
          <Avatar name={authorName} size="md" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/profile/${authorId}`} className="block truncate text-sm font-semibold text-ink-900 dark:text-white hover:underline">
            {authorName}
          </Link>
          {authorHeadline && <p className="truncate text-xs text-ink-500 dark:text-ink-400">{authorHeadline}</p>}
        </div>
      </div>
      {!isSelf && (
        <button
          type="button"
          disabled={isLoading || pending}
          onClick={() => (isFollowing ? unfollow.mutate(authorId) : follow.mutate(authorId))}
          className={
            'mt-3 w-full rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-60 ' +
            (isFollowing
              ? 'border border-ink-200 text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800'
              : 'bg-brand-600 text-white hover:bg-brand-700')
          }
        >
          {isFollowing ? 'Following' : 'Follow author'}
        </button>
      )}
      <Link href={`/profile/${authorId}`} className="mt-2 inline-block text-xs font-semibold text-brand-600 hover:text-brand-700">
        View full profile
      </Link>
    </Card>
  );
}

function TableOfContentsCard({ article }: { article: ArticleData }) {
  const headings = extractHeadings(article.article.contentJson);
  if (!headings.length) return null;
  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-bold text-ink-900 dark:text-white">Table of contents</h3>
      <ol className="space-y-1.5">
        {headings.map((h, idx) => (
          <li key={h.id + idx}>
            <a href={`#${h.id}`} className="text-xs font-medium text-ink-600 hover:text-brand-600 dark:text-ink-300 dark:hover:text-brand-400">
              {idx + 1}. {h.text}
            </a>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function RelatedArticlesCard({ postId }: { postId: string }) {
  const { data: related, isLoading } = useRelatedArticles(postId);
  if (isLoading) return null;
  if (!related || related.length === 0) return null;

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-bold text-ink-900 dark:text-white">Related articles</h3>
      <div className="space-y-3">
        {related.map((r) => (
          <Link key={r.postId} href={`/app/article-detail/${r.postId}`} className="flex gap-2.5 group">
            {r.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.coverImageUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
            ) : (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-bold text-ink-400">Aa</span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink-900 group-hover:underline dark:text-white">{r.title}</p>
              <p className="text-xs text-ink-400 dark:text-ink-500">
                {r.author?.name} · {formatDistanceToNowStrict(new Date(r.createdAt), { addSuffix: true })}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
