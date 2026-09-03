import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { contentTypeLabel, getResource } from '../lib';
import { getPlaceholderAvatarUrl } from '@/lib/placeholderAvatar';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await getResource(slug);
  if (!article) return { title: 'Blog & Resources — Gigvora' };
  return {
    title: `${article.title} — Gigvora`,
    description: article.summary,
    alternates: { canonical: `/app/blog--resources/${slug}` },
    openGraph: {
      title: article.title,
      description: article.summary,
      url: `/app/blog--resources/${slug}`,
      type: 'article',
      images: article.coverImageUrl ? [{ url: article.coverImageUrl }] : undefined,
    },
  };
}

export default async function BlogResourceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getResource(slug);
  if (!article) notFound();

  const paragraphs = article.body.split('\n\n').filter(Boolean);

  return (
    <PublicPageShell pageId="02.20">
      <article className="mx-auto max-w-3xl px-6 py-10 lg:px-0">
        <Link href="/app/blog--resources" className="text-sm font-semibold text-brand-600 hover:underline">
          ← Back to Blog &amp; Resources
        </Link>

        <div className="mt-4 flex items-center gap-2">
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-600">
            {contentTypeLabel(article.contentType)}
          </span>
          <span className="text-xs text-ink-400">· {article.readMinutes}</span>
        </div>

        <h1 className="mt-3 text-3xl font-extrabold text-ink-900">{article.title}</h1>
        <p className="mt-2 text-base text-ink-500">{article.summary}</p>

        <div className="mt-4 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getPlaceholderAvatarUrl(article.author.name)}
            alt=""
            aria-hidden
            className="h-9 w-9 rounded-full object-cover ring-1 ring-black/5"
          />
          <div>
            <p className="text-sm font-semibold text-ink-900">{article.author.name}</p>
            <p className="text-xs text-ink-500">{article.author.headline} · {formatDate(article.publishedAt)}</p>
          </div>
        </div>

        {article.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={article.coverImageUrl} alt="" className="mt-6 aspect-[16/9] w-full rounded-2xl object-cover" />
        ) : (
          <div className="mt-6 aspect-[16/9] w-full rounded-2xl bg-gradient-to-br from-sky-100 via-brand-50 to-brand-100" />
        )}

        <div className="prose prose-sm mt-8 max-w-none text-ink-700">
          {paragraphs.map((p, i) => (
            <p key={i} className="mb-4 whitespace-pre-wrap leading-relaxed">
              {p}
            </p>
          ))}
        </div>

        <Link
          href={`/app/blog--resources?type=${article.contentType}`}
          className="mt-8 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"
        >
          ← Back to {contentTypeLabel(article.contentType)}s
        </Link>
      </article>
    </PublicPageShell>
  );
}
