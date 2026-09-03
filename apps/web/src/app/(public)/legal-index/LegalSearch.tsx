'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, ShieldCheck, FileText, Cookie, Users2, Database, Lock, Accessibility, UserCog, Archive, Award, ScrollText } from 'lucide-react';
import type { LegalDocSummary } from './lib';

// Small, fixed dataset (12 documents) — filtering happens client-side
// against the list already fetched server-side, no round-trip needed.
const DOC_ICONS: Record<string, typeof ShieldCheck> = {
  'privacy-policy': ShieldCheck,
  'terms-of-service': FileText,
  'cookie-policy': Cookie,
  'acceptable-use-policy': ShieldCheck,
  'community-guidelines': Users2,
  'data-processing-addendum': Database,
  'security-overview': Lock,
  'accessibility-statement': Accessibility,
  'subprocessor-list': UserCog,
  'data-retention-policy': Archive,
  'compliance-certifications': Award,
  'legal-notices': ScrollText,
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function LegalSearch({ docs }: { docs: LegalDocSummary[] }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter((d) => d.title.toLowerCase().includes(q) || d.summary.toLowerCase().includes(q));
  }, [docs, query]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search legal documents, policies, or compliance topics..."
            className="w-full rounded-xl border border-ink-200 bg-white py-3 pl-11 pr-4 text-sm text-ink-900 outline-none placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        {/* Only one real category exists in the seeded taxonomy (Legal & Compliance),
            so this is a working no-op selector rather than fake multi-category filtering. */}
        <select
          disabled
          defaultValue="all"
          className="rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-600"
          aria-label="Document category"
        >
          <option value="all">All categories</option>
        </select>
      </div>

      <p className="mt-3 text-xs text-ink-500">
        {docs.length} document{docs.length === 1 ? '' : 's'}
        {query && ` · Showing ${filtered.length} matching "${query}"`}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {filtered.map((doc) => {
          const Icon = DOC_ICONS[doc.slug] ?? FileText;
          return (
            <Link
              key={doc.slug}
              href={`/legal-index/${doc.slug}`}
              className="group flex flex-col rounded-2xl border border-ink-100 p-4 shadow-surface hover:border-brand-200"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <Icon className="h-4.5 w-4.5" strokeWidth={1.75} />
              </span>
              <p className="mt-2.5 text-sm font-bold text-ink-900 group-hover:text-brand-700">{doc.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-500">{doc.summary}</p>
              <p className="mt-2 text-[11px] text-ink-400">Last updated {formatDate(doc.published_at)}</p>
              <span className="mt-2.5 text-xs font-semibold text-brand-600">View →</span>
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-full rounded-2xl border border-ink-100 p-8 text-center text-sm text-ink-500">
            No documents match &ldquo;{query}&rdquo;.
          </p>
        )}
      </div>
    </div>
  );
}
