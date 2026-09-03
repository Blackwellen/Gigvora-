import Link from 'next/link';
import { Bookmark, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { JobSummary } from '../publicCollectionApi';
import { formatRelativeDate, initials } from '../urlParams';

export function JobCard({ job, returnUrl }: { job: JobSummary; returnUrl: string }) {
  const salary =
    job.salaryMin && job.salaryMax
      ? `${job.salaryCurrency} ${job.salaryMin.toLocaleString()}-${job.salaryMax.toLocaleString()}/yr`
      : job.salaryMin
        ? `${job.salaryCurrency} ${job.salaryMin.toLocaleString()}+/yr`
        : null;

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-surface transition hover:border-brand-200 hover:shadow-popover">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-xs font-bold text-ink-600">
            {initials(job.company.name)}
          </span>
          <div className="min-w-0">
            <Link href={`/public-job?slug=${job.slug}`} className="block truncate text-base font-bold text-ink-900 hover:text-brand-600">
              {job.title}
            </Link>
            <Link href={`/public-company-page?slug=${job.company.slug}`} className="mt-0.5 block text-sm text-ink-500 hover:text-brand-600">
              {job.company.name}
            </Link>
          </div>
        </div>
        <Link
          href={`/sign-in?returnUrl=${encodeURIComponent(returnUrl)}`}
          aria-label="Save job"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ink-200 text-ink-400 hover:border-brand-200 hover:text-brand-600"
        >
          <Bookmark className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-500">
        {job.location && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {job.location}
          </span>
        )}
        <Badge tone="brand">{formatEmploymentType(job.employmentType)}</Badge>
        {job.workMode && <Badge tone="neutral">{formatWorkMode(job.workMode)}</Badge>}
      </div>

      {job.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {job.skills.slice(0, 5).map((skill) => (
            <span key={skill} className="rounded-full bg-ink-50 px-2.5 py-1 text-[11px] font-medium text-ink-600">
              {skill}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3">
        <div>
          {salary && <p className="text-sm font-bold text-ink-900">{salary}</p>}
          <p className="text-[11px] text-ink-500">Posted {formatRelativeDate(job.postedAt)}</p>
        </div>
        <Link
          href={`/public-job?slug=${job.slug}`}
          className="rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-700"
        >
          View job
        </Link>
      </div>
    </div>
  );
}

function formatEmploymentType(type: string) {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
function formatWorkMode(mode: string) {
  return mode.charAt(0).toUpperCase() + mode.slice(1).replace('_', ' ');
}
