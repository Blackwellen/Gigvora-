import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Eye, Headphones, Users } from 'lucide-react';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { HelpSearchBar } from './HelpSearchBar';
import { getHelpCategories, getPopularArticles, searchHelpArticles } from './lib';
import { helpCategoryIcon } from './iconMap';

const POPULAR_SEARCHES = ['Create an account', 'Post a gig', 'Hire a freelancer', 'Billing & payments', 'Verify your business'];

export const metadata: Metadata = {
  title: 'Help Centre — Gigvora',
  description: 'Search our Help Centre for guides, articles, and answers to common questions about Gigvora.',
  alternates: { canonical: '/help-centre' },
  openGraph: {
    title: 'How can Gigvora help?',
    description: 'Search our Help Centre for guides, articles, and answers.',
    url: '/help-centre',
    type: 'website',
  },
};

export default async function HelpCentrePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Gigvora Help Centre',
    url: 'https://gigvora.com/help-centre',
  };

  if (query) {
    const results = await searchHelpArticles(query);
    return (
      <PublicPageShell pageId="02.19">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <section className="relative overflow-hidden bg-brand-600 py-12">
          <div className="relative mx-auto max-w-[1440px] px-6 lg:px-10">
            <h1 className="text-center text-3xl font-extrabold text-white sm:text-4xl">How can Gigvora help?</h1>
            <p className="mt-2 text-center text-sm text-brand-100">Search our Help Centre for guides, articles, and answers.</p>
            <div className="mx-auto mt-6 max-w-2xl">
              <HelpSearchBar initialQuery={query} />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-6 py-10 lg:px-10">
          <p className="text-sm text-ink-500">
            {results.length} result{results.length === 1 ? '' : 's'} for <span className="font-semibold text-ink-900">&ldquo;{query}&rdquo;</span>
          </p>
          <div className="mt-4 divide-y divide-ink-100 rounded-2xl border border-ink-100">
            {results.map((article) => (
              <Link
                key={article.slug}
                href={`/help-centre/articles/${article.slug}`}
                className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-ink-50"
              >
                <div>
                  <p className="text-sm font-bold text-ink-900">{article.title}</p>
                  <p className="text-xs text-ink-500">{article.summary}</p>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-xs text-ink-400">
                  <Eye className="h-3.5 w-3.5" /> {article.viewCount.toLocaleString()}
                </span>
              </Link>
            ))}
            {results.length === 0 && (
              <p className="px-5 py-10 text-center text-sm text-ink-500">
                No articles matched your search. Try a different term, or{' '}
                <Link href="/contact?topic=general_contact" className="font-semibold text-brand-600 hover:underline">
                  contact support
                </Link>
                .
              </p>
            )}
          </div>
          <Link href="/help-centre" className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">
            ← Back to Help Centre
          </Link>
        </section>
      </PublicPageShell>
    );
  }

  const [categories, popular] = await Promise.all([getHelpCategories(), getPopularArticles(5)]);

  return (
    <PublicPageShell pageId="02.19">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="relative overflow-hidden bg-brand-600 py-14">
        <div aria-hidden className="pointer-events-none absolute -left-16 -top-20 h-64 w-64 rounded-full border-[40px] border-brand-500/40" />
        <div aria-hidden className="pointer-events-none absolute -right-20 bottom-[-60px] h-72 w-72 rounded-full border-[40px] border-brand-500/40" />
        <div className="relative mx-auto max-w-[1440px] px-6 lg:px-10">
          <h1 className="text-center text-3xl font-extrabold text-white sm:text-4xl">How can Gigvora help?</h1>
          <p className="mt-2 text-center text-sm text-brand-100">Search our Help Centre for guides, articles, and answers.</p>
          <div className="mx-auto mt-6 max-w-2xl">
            <HelpSearchBar />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-brand-100">Popular searches:</span>
            {POPULAR_SEARCHES.map((term) => (
              <Link
                key={term}
                href={`/help-centre?q=${encodeURIComponent(term)}`}
                className="rounded-full border border-white/30 px-3 py-1 text-xs font-medium text-white hover:bg-white/10"
              >
                {term}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-6 pt-6 lg:px-10">
        <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">All systems operational</p>
              <p className="text-xs text-emerald-700">Informational status only — this label is not driven by a live infrastructure feed.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-6 py-10 lg:grid-cols-3 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div>
            <h2 className="text-sm font-bold text-ink-900">Browse help by topic</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {categories.map((cat) => {
                const Icon = helpCategoryIcon(cat.icon_key);
                return (
                  <Link
                    key={cat.slug}
                    href={`/help-centre/${cat.slug}`}
                    className="group flex items-start gap-3 rounded-2xl border border-ink-100 p-4 shadow-surface hover:border-brand-200"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                      <Icon className="h-4.5 w-4.5" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-ink-900">{cat.name}</p>
                      <p className="text-xs text-ink-500">{cat.description}</p>
                    </div>
                    <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-ink-300 group-hover:text-brand-600" />
                  </Link>
                );
              })}
              {categories.length === 0 && (
                <p className="col-span-full rounded-2xl border border-ink-100 p-6 text-center text-sm text-ink-500">
                  Help topics are temporarily unavailable.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-ink-100 p-5 shadow-surface">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink-900">Popular articles</h2>
            </div>
            <ol className="mt-3 space-y-3">
              {popular.map((article, i) => (
                <li key={article.slug}>
                  <Link href={`/help-centre/articles/${article.slug}`} className="flex items-start gap-2.5 group">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-100 text-[11px] font-bold text-ink-600">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink-900 group-hover:text-brand-600">{article.title}</span>
                      <span className="flex items-center gap-1 text-[11px] text-ink-400">
                        <Eye className="h-3 w-3" /> {article.viewCount.toLocaleString()}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
              {popular.length === 0 && <p className="text-sm text-ink-500">No popular articles yet.</p>}
            </ol>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-6 pb-14 lg:px-10">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-ink-100 p-5 shadow-surface">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <Headphones className="h-4.5 w-4.5" strokeWidth={1.75} />
            </span>
            <p className="mt-3 text-sm font-bold text-ink-900">Still need help?</p>
            <p className="text-xs text-ink-500">Our support team is here for you.</p>
            <ul className="mt-3 space-y-1.5 text-xs text-ink-600">
              <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Get personalized help</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Fast response times</li>
            </ul>
            <Link
              href="/contact?topic=general_contact"
              className="mt-4 inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Contact support
            </Link>
          </div>

          <div className="rounded-2xl border border-ink-100 p-5 shadow-surface">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <Users className="h-4.5 w-4.5" strokeWidth={1.75} />
            </span>
            <p className="mt-3 text-sm font-bold text-ink-900">Join the community</p>
            <p className="text-xs text-ink-500">Connect with other professionals, share insights, and get answers from the community.</p>
            <Link
              href="/groups-directory"
              className="mt-4 inline-flex items-center justify-center rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-50"
            >
              Browse community
            </Link>
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}
