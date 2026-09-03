import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Eye } from 'lucide-react';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { getHelpArticle } from '../../lib';
import { HelpfulWidget } from './HelpfulWidget';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await getHelpArticle(slug);
  if (!article) return { title: 'Help Centre — Gigvora' };
  return {
    title: `${article.title} — Help Centre — Gigvora`,
    description: article.summary,
    alternates: { canonical: `/help-centre/articles/${slug}` },
  };
}

export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getHelpArticle(slug);
  if (!article) notFound();

  const paragraphs = article.body.split('\n\n').filter(Boolean);
  const publishedDate = new Date(article.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <PublicPageShell pageId="02.19">
      <article className="mx-auto max-w-3xl px-6 py-10 lg:px-0">
        <nav className="text-xs text-ink-500">
          <Link href="/help-centre" className="hover:text-ink-800">Help Centre</Link>
          <span className="mx-1.5">/</span>
          <Link href={`/help-centre/${article.category.slug}`} className="hover:text-ink-800">{article.category.name}</Link>
          <span className="mx-1.5">/</span>
          <span className="text-ink-800">{article.title}</span>
        </nav>

        <h1 className="mt-4 text-3xl font-extrabold text-ink-900">{article.title}</h1>
        <p className="mt-2 text-base text-ink-500">{article.summary}</p>
        <div className="mt-3 flex items-center gap-4 text-xs text-ink-400">
          <span>Published {publishedDate}</span>
          <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {article.viewCount.toLocaleString()} views</span>
        </div>

        <div className="prose prose-sm mt-8 max-w-none text-ink-700">
          {paragraphs.map((p, i) => (
            <p key={i} className="mb-4 whitespace-pre-wrap leading-relaxed">
              {p}
            </p>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-ink-100 p-5 shadow-surface">
          <HelpfulWidget slug={article.slug} />
        </div>

        <Link
          href={`/help-centre/${article.category.slug}`}
          className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"
        >
          ← Back to {article.category.name}
        </Link>
      </article>
    </PublicPageShell>
  );
}
