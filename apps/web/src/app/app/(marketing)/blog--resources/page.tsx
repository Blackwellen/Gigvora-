import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { TrustLogosRow } from '@/components/public/marketing/TrustLogosRow';
import { ArticleCard } from './ArticleCard';
import { ResourceFilters } from './ResourceFilters';
import { contentTypeLabel, getFeaturedResource, getResources, normalizeContentType } from './lib';
import { getPlaceholderAvatarUrl } from '@/lib/placeholderAvatar';

const LOGOS = ['Google', 'Microsoft', 'IBM', 'airbnb', 'shopify', 'Deloitte'];

const QUICK_SECTIONS: Array<{ type: 'report' | 'webinar' | 'guide' | 'playbook'; label: string }> = [
  { type: 'report', label: 'Reports' },
  { type: 'webinar', label: 'Webinars' },
  { type: 'guide', label: 'Guides' },
  { type: 'playbook', label: 'Playbooks' },
];

export const metadata: Metadata = {
  title: 'Blog & Resources — Gigvora',
  description: 'Expert insights, practical guides, product updates, and real-world stories to help you connect, hire, and grow with confidence.',
  alternates: { canonical: '/app/blog--resources' },
  openGraph: {
    title: 'Insights that move you from insight to impact.',
    description: 'Expert insights, practical guides, product updates, and real-world stories from Gigvora.',
    url: '/app/blog--resources',
    type: 'website',
  },
};

export default async function BlogResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string }>;
}) {
  const { type, q } = await searchParams;
  const activeType = normalizeContentType(type);
  const query = q?.trim() ?? '';

  const [featured, articles] = await Promise.all([
    activeType === 'all' && !query ? getFeaturedResource() : Promise.resolve(null),
    getResources({ type: activeType === 'all' ? undefined : activeType, q: query || undefined, limit: 8 }),
  ]);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Gigvora Blog & Resources',
    url: 'https://gigvora.com/app/blog--resources',
  };

  return (
    <PublicPageShell pageId="02.20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <section className="relative overflow-hidden">
          <div className="relative mx-auto grid max-w-[1440px] gap-8 px-6 py-12 lg:grid-cols-[1fr_1.3fr] lg:px-10">
            <div>
              <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-ink-900 sm:text-5xl">
                Insights that move you
                <br />
                from <span className="text-brand-600">insight to impact.</span>
              </h1>
              <p className="mt-4 max-w-md text-base text-ink-500">
                Expert insights, practical guides, product updates, and real-world stories to help you connect, hire, and grow with confidence.
              </p>
            </div>

            {featured ? (
              <Link
                href={`/app/blog--resources/${featured.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-ink-100 shadow-surface sm:flex-row"
              >
                <div className="relative flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br from-sky-100 via-brand-50 to-brand-100 sm:aspect-auto sm:w-2/5">
                  {featured.coverImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={featured.coverImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex flex-1 flex-col justify-center p-5">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-brand-600 px-2.5 py-0.5 text-[10px] font-bold text-white">Featured</span>
                    <span className="text-xs font-semibold text-ink-500">{contentTypeLabel(featured.contentType)}</span>
                    <span className="text-xs text-ink-400">· {featured.readMinutes}</span>
                  </div>
                  <p className="mt-2 text-lg font-bold text-ink-900 group-hover:text-brand-700">{featured.title}</p>
                  <p className="mt-1 text-sm text-ink-500">{featured.summary}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getPlaceholderAvatarUrl(featured.author.name)}
                        alt=""
                        aria-hidden
                        className="h-7 w-7 rounded-full object-cover ring-1 ring-black/5"
                      />
                      <div>
                        <p className="text-xs font-semibold text-ink-800">{featured.author.name}</p>
                        <p className="text-[11px] text-ink-400">{featured.author.headline}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-brand-600">Read article →</span>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="flex items-center justify-center rounded-2xl border border-dashed border-ink-200 p-8 text-center text-sm text-ink-500">
                No featured article is set right now.
              </div>
            )}
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-6 pb-6 lg:px-10">
          <ResourceFilters activeType={activeType} initialQuery={query} />
        </section>

        <section className="mx-auto max-w-[1440px] px-6 pb-10 lg:px-10">
          <h2 className="mb-4 text-lg font-bold text-ink-900">
            {query ? `Results for "${query}"` : activeType === 'all' ? 'Recent Articles' : contentTypeLabel(activeType) + 's'}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {articles.map((article, i) => (
              <ArticleCard key={article.slug} article={article} index={i} />
            ))}
            {articles.length === 0 && (
              <p className="col-span-full rounded-2xl border border-ink-100 p-10 text-center text-sm text-ink-500">
                No articles match this filter yet.
              </p>
            )}
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-6 pb-10 lg:px-10">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK_SECTIONS.map((section) => (
              <Link
                key={section.type}
                href={`/app/blog--resources?type=${section.type}`}
                className="flex items-center justify-between rounded-2xl border border-ink-100 p-4 shadow-surface hover:border-brand-200"
              >
                <span className="text-sm font-bold text-ink-900">{section.label}</span>
                <span className="text-xs font-semibold text-brand-600">View all →</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-6 pb-10 lg:px-10">
          <TrustLogosRow logos={LOGOS} rating={{ score: '4.8/5', count: '3,200+' }} />
        </section>
    </PublicPageShell>
  );
}
