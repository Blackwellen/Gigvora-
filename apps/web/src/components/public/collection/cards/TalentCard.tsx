import Link from 'next/link';
import { BadgeCheck, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { TalentSummary } from '../publicCollectionApi';
import { getPlaceholderAvatarUrl } from '@/lib/placeholderAvatar';

export function TalentCard({ talent, returnUrl }: { talent: TalentSummary; returnUrl: string }) {
  const rate =
    talent.rate && (talent.rate.min || talent.rate.max)
      ? `${talent.rate.currency} ${talent.rate.min?.toLocaleString() ?? ''}${
          talent.rate.max ? `-${talent.rate.max.toLocaleString()}` : '+'
        }/${talent.rate.type === 'hourly' ? 'hr' : talent.rate.type}`
      : null;

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-surface transition hover:border-brand-200 hover:shadow-popover">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getPlaceholderAvatarUrl(talent.slug)}
          alt=""
          aria-hidden
          className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-black/5"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Link href={`/public-profile?slug=${talent.slug}`} className="truncate text-base font-bold text-ink-900 hover:text-brand-600">
              {talent.name}
            </Link>
            {talent.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-brand-600" />}
          </div>
          {talent.headline && <p className="mt-0.5 truncate text-sm text-ink-500">{talent.headline}</p>}
          {talent.location && (
            <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-ink-500">
              <MapPin className="h-3 w-3" /> {talent.location}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge tone={talent.availability === 'available' ? 'success' : 'neutral'}>
          {talent.availability === 'available' ? 'Available' : 'Not available'}
        </Badge>
        {talent.industry && <Badge tone="neutral">{talent.industry}</Badge>}
      </div>

      {talent.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {talent.skills.slice(0, 5).map((skill) => (
            <span key={skill} className="rounded-full bg-ink-50 px-2.5 py-1 text-[11px] font-medium text-ink-600">
              {skill}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-ink-100 pt-3">
        {rate ? <p className="text-sm font-bold text-ink-900">{rate}</p> : <span />}
        <div className="flex items-center gap-2">
          <Link
            href={`/sign-in?returnUrl=${encodeURIComponent(returnUrl)}`}
            className="rounded-lg border border-ink-200 px-3 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-50"
          >
            Connect
          </Link>
          <Link
            href={`/public-profile?slug=${talent.slug}`}
            className="rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-700"
          >
            View profile
          </Link>
        </div>
      </div>
    </div>
  );
}
