import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { getLegalDoc } from '../lib';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getLegalDoc(slug);
  if (!doc) return { title: 'Legal Document — Gigvora' };
  return {
    title: `${doc.title} — Gigvora`,
    description: doc.summary,
    alternates: { canonical: `/legal-index/${slug}` },
  };
}

export default async function LegalDocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = await getLegalDoc(slug);
  if (!doc) notFound();

  const paragraphs = doc.body.split('\n\n').filter(Boolean);

  return (
    <PublicPageShell pageId="02.21">
      <article className="mx-auto max-w-3xl px-6 py-10 lg:px-0">
        <nav className="text-xs text-ink-500">
          <Link href="/legal-index" className="hover:text-ink-800">Legal, privacy &amp; trust</Link>
          <span className="mx-1.5">/</span>
          <span className="text-ink-800">{doc.title}</span>
        </nav>

        <h1 className="mt-4 text-3xl font-extrabold text-ink-900">{doc.title}</h1>
        <p className="mt-2 text-base text-ink-500">{doc.summary}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-400">
          <span>Version {doc.version}</span>
          <span>Effective {formatDate(doc.effectiveAt)}</span>
          <span>Published {formatDate(doc.publishedAt)}</span>
        </div>

        <div className="prose prose-sm mt-8 max-w-none text-ink-700">
          {paragraphs.map((p, i) => (
            <p key={i} className="mb-4 whitespace-pre-wrap leading-relaxed">
              {p}
            </p>
          ))}
        </div>

        {doc.history.length > 1 && (
          <div className="mt-10 rounded-2xl border border-ink-100 p-5 shadow-surface">
            <p className="text-sm font-bold text-ink-900">Version history</p>
            <ul className="mt-3 space-y-2 text-xs text-ink-600">
              {doc.history.map((h) => (
                <li key={h.version} className="flex items-center justify-between border-b border-ink-50 pb-2 last:border-0 last:pb-0">
                  <span>Version {h.version}</span>
                  <span>
                    Effective {formatDate(h.effective_at)}
                    {h.superseded_at ? ` · Superseded ${formatDate(h.superseded_at)}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Link href="/legal-index" className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">
          ← Back to Legal, Privacy &amp; Trust
        </Link>
      </article>
    </PublicPageShell>
  );
}
