import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Eye } from 'lucide-react';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { getHelpCategoryDetail } from '../lib';
import { helpCategoryIcon } from '../iconMap';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getHelpCategoryDetail(slug);
  if (!detail) return { title: 'Help Centre — Gigvora' };
  return {
    title: `${detail.category.name} — Help Centre — Gigvora`,
    description: detail.category.description,
    alternates: { canonical: `/help-centre/${slug}` },
  };
}

export default async function HelpCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = await getHelpCategoryDetail(slug);
  if (!detail) notFound();

  const { category, articles } = detail;
  const Icon = helpCategoryIcon(category.icon_key);

  return (
    <PublicPageShell pageId="02.19">
      <section className="mx-auto max-w-[1440px] px-6 py-10 lg:px-10">
        <nav className="text-xs text-ink-500">
          <Link href="/help-centre" className="hover:text-ink-800">Help Centre</Link>
          <span className="mx-1.5">/</span>
          <span className="text-ink-800">{category.name}</span>
        </nav>

        <div className="mt-4 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-ink-900">{category.name}</h1>
            <p className="text-sm text-ink-500">{category.description}</p>
          </div>
        </div>

        <div className="mt-8 divide-y divide-ink-100 rounded-2xl border border-ink-100">
          {articles.map((article) => (
            <Link
              key={article.slug}
              href={`/help-centre/articles/${article.slug}`}
              className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-ink-50"
            >
              <div>
                <p className="text-sm font-bold text-ink-900">{article.title}</p>
                <p className="text-xs text-ink-500">{article.summary}</p>
              </div>
              <span className="flex shrink-0 items-center gap-3 text-xs text-ink-400">
                <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {article.viewCount.toLocaleString()}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
          {articles.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-ink-500">No articles published in this topic yet.</p>
          )}
        </div>

        <Link href="/help-centre" className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">
          ← Back to Help Centre
        </Link>
      </section>
    </PublicPageShell>
  );
}
