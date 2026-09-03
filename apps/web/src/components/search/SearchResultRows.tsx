'use client';

import Link from 'next/link';
import { Briefcase, Building2, FileText, MapPin } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import type { CompanyResult, GigResult, PersonResult, PostResult } from '@/hooks/useSearch';

const rowClass =
  'flex items-center gap-3 rounded-xl border border-ink-100 bg-white p-3 transition-colors hover:border-brand-200 hover:shadow-surface dark:border-ink-800 dark:bg-ink-900';

function iconTile(icon: React.ReactNode) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-500 dark:bg-ink-800">
      {icon}
    </span>
  );
}

export function PersonRow({ person }: { person: PersonResult }) {
  const name = `${person.first_name} ${person.last_name}`.trim();
  return (
    <Link href={`/profile/${person.id}`} className={rowClass}>
      <Avatar name={name} size="md" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink-900 dark:text-white">{name}</span>
        {person.headline && <span className="block truncate text-xs text-ink-500 dark:text-ink-400">{person.headline}</span>}
      </span>
      {person.account_type && (
        <Badge tone="neutral" className="shrink-0 capitalize">
          {person.account_type.replace(/_/g, ' ')}
        </Badge>
      )}
    </Link>
  );
}

export function CompanyRow({ company }: { company: CompanyResult }) {
  return (
    <Link href={`/app/pages?company=${company.slug}`} className={rowClass}>
      {company.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={company.logo_url} alt={company.name} className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-black/5" />
      ) : (
        iconTile(<Building2 className="h-5 w-5" />)
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink-900 dark:text-white">{company.name}</span>
        {company.industry && <span className="block truncate text-xs text-ink-500 dark:text-ink-400">{company.industry}</span>}
      </span>
    </Link>
  );
}

function formatSalary(gig: GigResult) {
  if (!gig.salary_min && !gig.salary_max) return null;
  const currency = gig.salary_currency || 'USD';
  const fmt = (n: number) => `${currency} ${n.toLocaleString()}`;
  if (gig.salary_min && gig.salary_max) return `${fmt(gig.salary_min)} – ${fmt(gig.salary_max)}`;
  return fmt(gig.salary_min || gig.salary_max || 0);
}

export function GigRow({ gig }: { gig: GigResult }) {
  const salary = formatSalary(gig);
  return (
    <Link href="/app/gigs" className={rowClass}>
      {iconTile(<Briefcase className="h-5 w-5" />)}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink-900 dark:text-white">{gig.title}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-ink-500 dark:text-ink-400">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {gig.location || 'Remote'}
          </span>
          <span aria-hidden>·</span>
          <span className="capitalize">{gig.work_mode}</span>
          <span aria-hidden>·</span>
          <span className="capitalize">{gig.employment_type.replace(/_/g, ' ')}</span>
          {salary && (
            <>
              <span aria-hidden>·</span>
              <span>{salary}</span>
            </>
          )}
        </span>
      </span>
    </Link>
  );
}

export function PostRow({ post }: { post: PostResult }) {
  const name = `${post.first_name} ${post.last_name}`.trim();
  return (
    <Link href={`/app/live-feed?post=${post.id}`} className={rowClass}>
      {iconTile(<FileText className="h-5 w-5" />)}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink-900 dark:text-white">{name || 'Gigvora member'}</span>
        <span className="block truncate text-xs text-ink-500 dark:text-ink-400">{post.content}</span>
      </span>
    </Link>
  );
}
