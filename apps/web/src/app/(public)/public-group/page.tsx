import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Users, Lock, Globe2, Heart, LogIn } from 'lucide-react';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { PublicBreadcrumbs } from '@/components/public/detail/PublicBreadcrumbs';
import { PublicShareMenu } from '@/components/public/detail/PublicShareMenu';
import { DetailTabs } from '@/components/public/detail/DetailTabs';
import { NotSharedYet } from '@/components/public/detail/NotSharedYet';
import { signInHref } from '@/components/public/detail/authGate';
import { fetchPublicObject } from '@/components/public/detail/fetchPublicObject';
import { formatCompactNumber } from '@/components/public/collection/lib';

type GroupDetail = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  industry: string | null;
  coverUrl: string | null;
  iconUrl: string | null;
  tags: string[];
  visibility: 'public' | 'private';
  memberCount: number;
  createdAt: string | null;
  canViewContent: boolean;
  moderator?: { id: string; name: string; headline: string | null } | null;
  relatedGroups?: Array<{ id: string; slug: string; name: string; memberCount: number; category: string | null }>;
};

async function getGroup(slug: string) {
  return fetchPublicObject<GroupDetail>(`/public/groups/${encodeURIComponent(slug)}`);
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ slug?: string }> }): Promise<Metadata> {
  const { slug } = await searchParams;
  if (!slug) return { title: 'Group — Gigvora' };
  const group = await getGroup(slug);
  if (!group) return { title: 'Group — Gigvora' };
  const title = `${group.name} | Gigvora Groups`;
  const description = group.description?.slice(0, 160) || `Join ${group.name} on Gigvora.`;
  return {
    title,
    description,
    alternates: { canonical: `/public-group?slug=${group.slug}` },
    openGraph: { title, description, url: `/public-group?slug=${group.slug}`, type: 'website' },
  };
}

export default async function PublicGroupPage({ searchParams }: { searchParams: Promise<{ slug?: string }> }) {
  const { slug } = await searchParams;
  if (!slug) notFound();
  const group = await getGroup(slug);
  if (!group) notFound();

  const returnPath = `/public-group?slug=${group.slug}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: group.name,
    ...(group.description ? { description: group.description } : {}),
  };

  const header = (
    <>
      <div
        className="h-40 w-full rounded-t-2xl bg-gradient-to-r from-brand-500 to-brand-700"
        style={group.coverUrl ? { backgroundImage: `url(${group.coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      />
      <div className="px-6 pb-6">
        <div className="-mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            {group.iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={group.iconUrl} alt={group.name} className="h-20 w-20 rounded-2xl border-4 border-white object-cover shadow-surface" />
            ) : (
              <span className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-brand-100 text-brand-700 shadow-surface">
                <Users className="h-8 w-8" />
              </span>
            )}
            <div className="pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-extrabold text-ink-900">{group.name}</h1>
                <Badge tone={group.visibility === 'public' ? 'success' : 'neutral'}>
                  {group.visibility === 'public' ? (
                    <span className="inline-flex items-center gap-1"><Globe2 className="h-3 w-3" /> Public</span>
                  ) : (
                    <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" /> Private</span>
                  )}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-ink-500">
                {formatCompactNumber(group.memberCount)} members{group.category ? ` · ${group.category}` : ''}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pb-1 sm:flex-col sm:items-stretch">
            <a href={signInHref(returnPath, 'join_group')} className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
              <LogIn className="h-4 w-4" /> Join
            </a>
            <a href={signInHref(returnPath, 'follow_group')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-50">
              <Heart className="h-4 w-4" /> Follow
            </a>
            <PublicShareMenu />
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-ink-600">{group.description || 'No description provided.'}</p>
        {group.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {group.tags.map((tag) => (
              <Badge key={tag} tone="neutral">{tag}</Badge>
            ))}
          </div>
        )}
      </div>
    </>
  );

  if (!group.canViewContent) {
    return (
      <PublicPageShell pageId="02.28">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <div className="mx-auto max-w-[900px] px-6 py-8 lg:px-10">
          <PublicBreadcrumbs items={[{ label: 'Groups Directory', href: '/groups-directory' }, { label: group.name }]} />
          <Card className="mt-4 overflow-hidden">{header}</Card>
          <Card className="mt-6 p-8 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ink-100 text-ink-500">
              <Lock className="h-6 w-6" />
            </span>
            <p className="mt-3 text-sm font-bold text-ink-900">This is a private group</p>
            <p className="mt-1 text-sm text-ink-500">Join to see discussions, members, and events.</p>
            <a href={signInHref(returnPath, 'join_group')} className="mt-4 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
              Join this group
            </a>
          </Card>
        </div>
      </PublicPageShell>
    );
  }

  const tabDefs = [
    {
      key: 'overview',
      label: 'Overview',
      content: (
        <Card className="p-5">
          <h3 className="text-sm font-bold text-ink-900">About this group</h3>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-600">{group.description || 'No description provided.'}</p>
          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">Category</dt>
              <dd className="mt-0.5 text-sm text-ink-700">{group.category || 'Not shared'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">Industry</dt>
              <dd className="mt-0.5 text-sm text-ink-700">{group.industry || 'Not shared'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">Members</dt>
              <dd className="mt-0.5 text-sm text-ink-700">{formatCompactNumber(group.memberCount)}</dd>
            </div>
          </dl>
        </Card>
      ),
    },
    { key: 'discussions', label: 'Discussions', content: <NotSharedYet message="Group discussions aren't available publicly yet." /> },
    { key: 'events', label: 'Events', content: <NotSharedYet message="No public events for this group yet." /> },
    {
      key: 'members',
      label: 'Members',
      content: (
        <div className="space-y-4">
          {group.moderator && (
            <Card className="p-5">
              <h3 className="text-sm font-bold text-ink-900">Group moderator</h3>
              <div className="mt-3 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                  {group.moderator.name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')}
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink-900">{group.moderator.name}</p>
                  {group.moderator.headline && <p className="text-xs text-ink-500">{group.moderator.headline}</p>}
                </div>
              </div>
            </Card>
          )}
          <NotSharedYet message="A full public member list isn't available for this group yet." />
        </div>
      ),
    },
    { key: 'media', label: 'Media', content: <NotSharedYet message="No public media shared in this group yet." /> },
    { key: 'about', label: 'About', content: (
        <Card className="p-5">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">Visibility</dt>
              <dd className="mt-0.5 text-sm text-ink-700">{group.visibility === 'public' ? 'Public' : 'Private'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">Created</dt>
              <dd className="mt-0.5 text-sm text-ink-700">
                {group.createdAt ? new Date(group.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : 'Not shared'}
              </dd>
            </div>
          </dl>
        </Card>
      ) },
  ];

  return (
    <PublicPageShell pageId="02.28">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mx-auto max-w-[1000px] px-6 py-8 lg:px-10">
        <PublicBreadcrumbs items={[{ label: 'Groups Directory', href: '/groups-directory' }, { label: group.name }]} />
        <Card className="mt-4 overflow-hidden">{header}</Card>
        <div className="mt-6">
          <DetailTabs tabs={tabDefs} />
        </div>

        {group.relatedGroups && group.relatedGroups.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-bold text-ink-900">Related groups</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {group.relatedGroups.map((g) => (
                <Link
                  key={g.id}
                  href={`/public-group?slug=${g.slug}`}
                  className="block rounded-2xl border border-ink-100 bg-white p-4 shadow-surface transition hover:border-brand-200 hover:shadow-popover"
                >
                  <p className="truncate text-sm font-semibold text-ink-900">{g.name}</p>
                  <p className="mt-1 text-xs text-ink-500">{formatCompactNumber(g.memberCount)} members{g.category ? ` · ${g.category}` : ''}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </PublicPageShell>
  );
}
