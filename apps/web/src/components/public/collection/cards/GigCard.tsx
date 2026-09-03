import Link from 'next/link';
import { Bookmark, MapPin, Clock, Users } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { GigSummary } from '../publicCollectionApi';
import { formatRelativeDate } from '../urlParams';

export function GigCard({ gig, returnUrl }: { gig: GigSummary; returnUrl: string }) {
  const rate =
    gig.rateMin && gig.rateMax
      ? `${gig.rateCurrency} ${gig.rateMin.toLocaleString()}-${gig.rateMax.toLocaleString()}/${rateSuffix(gig.rateType)}`
      : gig.rateMin
        ? `${gig.rateCurrency} ${gig.rateMin.toLocaleString()}+/${rateSuffix(gig.rateType)}`
        : null;

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-surface transition hover:border-brand-200 hover:shadow-popover">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {gig.featured && <Badge tone="brand">Featured</Badge>}
            <span className="text-xs font-medium text-ink-500">{gig.category}</span>
          </div>
          <Link href={`/public-gig?slug=${gig.slug}`} className="mt-1 block truncate text-base font-bold text-ink-900 hover:text-brand-600">
            {gig.title}
          </Link>
          <p className="mt-0.5 text-sm text-ink-500">{gig.company.name}</p>
        </div>
        <Link
          href={`/sign-in?returnUrl=${encodeURIComponent(returnUrl)}`}
          aria-label="Save gig"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ink-200 text-ink-400 hover:border-brand-200 hover:text-brand-600"
        >
          <Bookmark className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-500">
        {gig.location && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {gig.location}
          </span>
        )}
        {gig.duration && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {gig.duration}
          </span>
        )}
        {gig.applicantCount > 0 && (
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> {gig.applicantCount} applicants
          </span>
        )}
        {gig.workMode && <Badge tone="neutral">{formatWorkMode(gig.workMode)}</Badge>}
      </div>

      {gig.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {gig.skills.slice(0, 5).map((skill) => (
            <span key={skill} className="rounded-full bg-ink-50 px-2.5 py-1 text-[11px] font-medium text-ink-600">
              {skill}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3">
        <div>
          {rate && <p className="text-sm font-bold text-ink-900">{rate}</p>}
          <p className="text-[11px] text-ink-500">Posted {formatRelativeDate(gig.postedAt)}</p>
        </div>
        <Link
          href={`/public-gig?slug=${gig.slug}`}
          className="rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-700"
        >
          View gig
        </Link>
      </div>
    </div>
  );
}

function rateSuffix(rateType: string) {
  if (rateType === 'hourly') return 'hr';
  if (rateType === 'daily') return 'day';
  if (rateType === 'weekly') return 'wk';
  if (rateType === 'monthly') return 'mo';
  return rateType;
}

function formatWorkMode(mode: string) {
  return mode.charAt(0).toUpperCase() + mode.slice(1).replace('_', ' ');
}
