import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Heart, MessageSquare, Repeat2, BadgeCheck, Building2 } from 'lucide-react';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { Card } from '@/components/ui/Card';
import { PublicBreadcrumbs } from '@/components/public/detail/PublicBreadcrumbs';
import { PublicShareMenu } from '@/components/public/detail/PublicShareMenu';
import { PublicRelatedObjects } from '@/components/public/detail/PublicRelatedObjects';
import { signInHref } from '@/components/public/detail/authGate';
import { fetchPublicObject } from '@/components/public/detail/fetchPublicObject';
import { formatRelativeDate } from '@/components/public/collection/lib';
import { getPlaceholderAvatarUrl } from '@/lib/placeholderAvatar';

// Only posts explicitly marked `visibility: 'public'` and published are ever
// returned by GET /public/posts/:id (apps/api/src/modules/public-directory) —
// a narrower, separate read path from the authenticated feed API, which
// still requires auth for every route. Connections-only/private posts are
// never reachable through this page.
type RelatedPost = {
  id: string;
  content: string;
  reactions: number;
  commentCount: number;
  publishedAt: string;
  author: { name: string };
};

type PublicPost = {
  id: string;
  content: string;
  topics: string[];
  reactions: number;
  commentCount: number;
  shareCount: number;
  publishedAt: string;
  author: {
    id: string;
    name: string;
    headline: string | null;
    verified: boolean;
    company: { name: string; slug: string } | null;
  };
  attachments: Array<{ type: string; url: string; fileName: string | null }>;
  relatedPosts: RelatedPost[];
};

async function getPost(id: string) {
  return fetchPublicObject<PublicPost>(`/public/posts/${encodeURIComponent(id)}`);
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ id?: string; slug?: string }> }): Promise<Metadata> {
  const { id: rawId, slug } = await searchParams;
  const id = rawId ?? slug;
  if (!id) return { title: 'Post — Gigvora' };
  const post = await getPost(id);
  if (!post) return { title: 'Post — Gigvora' };
  const title = `${post.author.name} on Gigvora: ${post.content.slice(0, 60)}${post.content.length > 60 ? '…' : ''}`;
  const description = post.content.slice(0, 160);
  return {
    title,
    description,
    alternates: { canonical: `/public-post?id=${post.id}` },
    openGraph: { title, description, url: `/public-post?id=${post.id}`, type: 'article' },
  };
}

export default async function PublicPostPage({ searchParams }: { searchParams: Promise<{ id?: string; slug?: string }> }) {
  const { id: rawId, slug } = await searchParams;
  const id = rawId ?? slug;
  if (!id) notFound();

  const post = await getPost(id);
  if (!post) notFound();

  const returnPath = `/public-post?id=${post.id}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SocialMediaPosting',
    identifier: post.id,
    headline: post.content.slice(0, 110),
    articleBody: post.content,
    datePublished: post.publishedAt,
    author: { '@type': 'Person', name: post.author.name },
    interactionStatistic: [
      { '@type': 'InteractionCounter', interactionType: 'https://schema.org/LikeAction', userInteractionCount: post.reactions },
      { '@type': 'InteractionCounter', interactionType: 'https://schema.org/CommentAction', userInteractionCount: post.commentCount },
      { '@type': 'InteractionCounter', interactionType: 'https://schema.org/ShareAction', userInteractionCount: post.shareCount },
    ],
  };

  return (
    <PublicPageShell pageId="02.26">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mx-auto grid max-w-[1200px] gap-6 px-6 py-8 lg:grid-cols-[1fr_320px] lg:px-10">
        <div>
          <PublicBreadcrumbs items={[{ label: 'Live Feed', href: '/home#products' }, { label: `${post.author.name}'s post` }]} />

          <Card className="mt-4 p-6">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getPlaceholderAvatarUrl(post.author.id)}
                alt=""
                aria-hidden
                className="h-11 w-11 rounded-full object-cover ring-1 ring-black/5"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-bold text-ink-900">{post.author.name}</p>
                  {post.author.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-brand-600" />}
                </div>
                {post.author.headline && <p className="truncate text-xs text-ink-500">{post.author.headline}</p>}
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-ink-400">
                  {formatRelativeDate(post.publishedAt) && <span>{formatRelativeDate(post.publishedAt)}</span>}
                  {post.author.company && (
                    <Link href={`/public-company-page?slug=${post.author.company.slug}`} className="inline-flex items-center gap-1 hover:text-brand-600">
                      <Building2 className="h-3 w-3" /> {post.author.company.name}
                    </Link>
                  )}
                </div>
              </div>
            </div>

            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink-800">{post.content}</p>

            {post.topics.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {post.topics.map((topic) => (
                  <span key={topic} className="rounded-full bg-ink-50 px-2.5 py-1 text-[11px] font-medium text-ink-600">
                    {topic}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4 flex items-center gap-4 border-t border-ink-100 pt-3 text-xs text-ink-500">
              <span>{post.reactions} reactions</span>
              <span>{post.commentCount} comments</span>
              <span>{post.shareCount} shares</span>
            </div>
          </Card>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <a href={signInHref(returnPath, 'like')} className="inline-flex items-center gap-2 rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-50">
              <Heart className="h-4 w-4" /> Like
            </a>
            <a href={signInHref(returnPath, 'comment')} className="inline-flex items-center gap-2 rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-50">
              <MessageSquare className="h-4 w-4" /> Comment
            </a>
            <a href={signInHref(returnPath, 'reshare')} className="inline-flex items-center gap-2 rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-50">
              <Repeat2 className="h-4 w-4" /> Reshare
            </a>
            <PublicShareMenu />
          </div>
        </div>

        <div className="space-y-6">
          <PublicRelatedObjects
            title={`More from ${post.author.name}`}
            items={post.relatedPosts.map((p) => ({
              title: p.content.slice(0, 80),
              subtitle: `${p.reactions} reactions · ${p.commentCount} comments`,
              href: `/public-post?id=${p.id}`,
            }))}
          />
          <Card className="p-5 text-center">
            <p className="text-sm font-bold text-ink-900">Join Gigvora to connect, learn, and grow.</p>
            <p className="mt-1 text-xs text-ink-500">Be part of a network of professionals sharing ideas and building the future.</p>
            <Link href="/sign-up?returnUrl=%2Fhome" className="mt-3 inline-block w-full rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700">
              Join Gigvora for free
            </Link>
            <a href={signInHref(returnPath)} className="mt-2 inline-block text-xs font-semibold text-ink-500 hover:text-ink-800">
              Already have an account? Sign in
            </a>
          </Card>
        </div>
      </div>
    </PublicPageShell>
  );
}
