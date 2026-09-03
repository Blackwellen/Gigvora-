import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MapPin, BadgeCheck, MessageSquare, UserPlus, Send, Bookmark } from 'lucide-react';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { PublicBreadcrumbs } from '@/components/public/detail/PublicBreadcrumbs';
import { PublicShareMenu } from '@/components/public/detail/PublicShareMenu';
import { DetailTabs } from '@/components/public/detail/DetailTabs';
import { NotSharedYet } from '@/components/public/detail/NotSharedYet';
import { signInHref } from '@/components/public/detail/authGate';
import { fetchPublicObject } from '@/components/public/detail/fetchPublicObject';
import { formatMoneyRange, humanizeEnum } from '@/components/public/collection/lib';
import { getPlaceholderAvatarUrl } from '@/lib/placeholderAvatar';

type TalentDetail = {
  id: string;
  slug: string;
  name: string;
  headline: string | null;
  location: string | null;
  industry: string | null;
  avatarUrl: string | null;
  skills: string[];
  verified: boolean;
  availability: 'available' | 'not_available';
  rate: { type: string; min: number; max: number; currency: string } | null;
  bio: string | null;
};

async function getTalent(slug: string) {
  return fetchPublicObject<TalentDetail>(`/public/talent/${encodeURIComponent(slug)}`);
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ slug?: string }> }): Promise<Metadata> {
  const { slug } = await searchParams;
  if (!slug) return { title: 'Profile — Gigvora' };
  const talent = await getTalent(slug);
  if (!talent) return { title: 'Profile — Gigvora' };
  const title = `${talent.name}${talent.headline ? ` — ${talent.headline}` : ''} | Gigvora`;
  const description = talent.bio?.slice(0, 160) || `View ${talent.name}'s profile on Gigvora.`;
  return {
    title,
    description,
    alternates: { canonical: `/public-profile?slug=${talent.slug}` },
    openGraph: { title, description, url: `/public-profile?slug=${talent.slug}`, type: 'profile' },
  };
}

export default async function PublicProfilePage({ searchParams }: { searchParams: Promise<{ slug?: string }> }) {
  const { slug } = await searchParams;
  if (!slug) notFound();
  const talent = await getTalent(slug);
  if (!talent) notFound();

  const returnPath = `/public-profile?slug=${talent.slug}`;
  const rate = talent.rate ? formatMoneyRange(talent.rate.min, talent.rate.max, talent.rate.currency, `/${humanizeEnum(talent.rate.type).toLowerCase()}`) : null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: talent.name,
    ...(talent.headline ? { jobTitle: talent.headline } : {}),
    ...(talent.location ? { address: talent.location } : {}),
    url: `https://gigvora.com/public-profile?slug=${talent.slug}`,
  };

  const tabs = [
    {
      key: 'overview',
      label: 'Overview',
      content: (
        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="text-sm font-bold text-ink-900">About</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              {talent.bio || 'This professional hasn’t added a bio yet.'}
            </p>
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-bold text-ink-900">Skills</h3>
            {talent.skills.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {talent.skills.map((skill) => (
                  <Badge key={skill} tone="neutral">
                    {skill}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-ink-500">No skills listed yet.</p>
            )}
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-bold text-ink-900">Details</h3>
            <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">Location</dt>
                <dd className="mt-0.5 text-ink-700">{talent.location || 'Not shared'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">Industry</dt>
                <dd className="mt-0.5 text-ink-700">{talent.industry || 'Not shared'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">Availability</dt>
                <dd className="mt-0.5 text-ink-700">{talent.availability === 'available' ? 'Available for work' : 'Not currently available'}</dd>
              </div>
              {rate && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">Rate</dt>
                  <dd className="mt-0.5 text-ink-700">{rate}</dd>
                </div>
              )}
            </dl>
          </Card>
        </div>
      ),
    },
    { key: 'experience', label: 'Experience', content: <NotSharedYet message="This professional hasn't shared their work experience publicly yet." /> },
    { key: 'skills', label: 'Skills', content: talent.skills.length > 0 ? (
        <Card className="p-5">
          <div className="flex flex-wrap gap-1.5">
            {talent.skills.map((skill) => (
              <Badge key={skill} tone="brand">{skill}</Badge>
            ))}
          </div>
        </Card>
      ) : <NotSharedYet message="No skills listed yet." /> },
    { key: 'portfolio', label: 'Portfolio', content: <NotSharedYet message="No portfolio items shared publicly yet." /> },
    { key: 'posts', label: 'Posts', content: <NotSharedYet message="No public posts to show yet." /> },
    { key: 'reviews', label: 'Reviews', content: <NotSharedYet message="No public reviews yet." /> },
  ];

  return (
    <PublicPageShell pageId="02.22">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-10">
        <PublicBreadcrumbs items={[{ label: 'Talent Directory', href: '/talent-directory' }, { label: talent.name }]} />

        <Card className="mt-4 p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <Avatar src={talent.avatarUrl || getPlaceholderAvatarUrl(talent.slug)} name={talent.name} size="xl" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-extrabold text-ink-900">{talent.name}</h1>
                  {talent.verified && (
                    <span title="Verified" className="text-brand-600">
                      <BadgeCheck className="h-5 w-5" />
                    </span>
                  )}
                  <Badge tone={talent.availability === 'available' ? 'success' : 'neutral'}>
                    {talent.availability === 'available' ? 'Available' : 'Not available'}
                  </Badge>
                </div>
                {talent.headline && <p className="mt-1 text-sm font-medium text-ink-600">{talent.headline}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-500">
                  {talent.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {talent.location}
                    </span>
                  )}
                  {talent.industry && <span>{talent.industry}</span>}
                  {rate && <span className="font-semibold text-ink-800">{rate}</span>}
                </div>
                {talent.skills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {talent.skills.slice(0, 8).map((skill) => (
                      <Badge key={skill} tone="neutral">{skill}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
              <a href={signInHref(returnPath, 'connect')} className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                <UserPlus className="h-4 w-4" /> Connect
              </a>
              <a href={signInHref(returnPath, 'message')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-50">
                <MessageSquare className="h-4 w-4" /> Message
              </a>
              <a href={signInHref(returnPath, 'invite_to_gig')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-50">
                <Send className="h-4 w-4" /> Invite to Gig
              </a>
              <a href={signInHref(returnPath, 'save_profile')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-50">
                <Bookmark className="h-4 w-4" /> Save
              </a>
              <PublicShareMenu />
            </div>
          </div>
        </Card>

        <div className="mt-6">
          <DetailTabs tabs={tabs} />
        </div>
      </div>
    </PublicPageShell>
  );
}
