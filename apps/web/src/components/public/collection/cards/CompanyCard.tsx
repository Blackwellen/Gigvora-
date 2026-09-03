import Link from 'next/link';
import { Briefcase } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { CompanySummary } from '../publicCollectionApi';
import { initials } from '../urlParams';

export function CompanyCard({ company }: { company: CompanySummary }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-surface transition hover:border-brand-200 hover:shadow-popover">
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-sm font-bold text-ink-600">
          {initials(company.name)}
        </span>
        <div className="min-w-0">
          <Link href={`/public-company-page?slug=${company.slug}`} className="block truncate text-base font-bold text-ink-900 hover:text-brand-600">
            {company.name}
          </Link>
          {company.industry && <p className="mt-0.5 truncate text-sm text-ink-500">{company.industry}</p>}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {company.size && <Badge tone="neutral">{company.size} employees</Badge>}
        <Badge tone="brand">
          <Briefcase className="mr-1 h-3 w-3" /> {company.openJobsCount} open {company.openJobsCount === 1 ? 'job' : 'jobs'}
        </Badge>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-ink-100 pt-3">
        <Link
          href={`/jobs-marketplace?q=${encodeURIComponent(company.name)}`}
          className="flex-1 rounded-lg border border-ink-200 px-3 py-2 text-center text-xs font-semibold text-ink-700 hover:bg-ink-50"
        >
          Open jobs
        </Link>
        <Link
          href={`/public-company-page?slug=${company.slug}`}
          className="flex-1 rounded-lg bg-brand-600 px-3 py-2 text-center text-xs font-semibold text-white hover:bg-brand-700"
        >
          View company
        </Link>
      </div>
    </div>
  );
}
