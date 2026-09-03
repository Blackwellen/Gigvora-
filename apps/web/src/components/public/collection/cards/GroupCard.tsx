import Link from 'next/link';
import { Users, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { GroupSummary } from '../publicCollectionApi';
import { formatCount } from '../urlParams';

const GRADIENTS = [
  'from-brand-500 to-indigo-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-fuchsia-500 to-pink-500',
  'from-sky-500 to-blue-600',
];

function gradientFor(seed: string) {
  const idx = seed.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % GRADIENTS.length;
  return GRADIENTS[idx];
}

export function GroupCard({ group, returnUrl }: { group: GroupSummary; returnUrl: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-surface transition hover:border-brand-200 hover:shadow-popover">
      <div
        className="h-20 w-full bg-cover bg-center"
        style={
          group.coverUrl
            ? { backgroundImage: `url(${group.coverUrl})` }
            : undefined
        }
      >
        {!group.coverUrl && <div className={`h-full w-full bg-gradient-to-r ${gradientFor(group.slug)}`} />}
      </div>
      <div className="p-5">
        <div className="-mt-10 flex items-end gap-3">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-4 border-white bg-ink-100 bg-cover bg-center text-sm font-bold text-ink-600 shadow-sm"
            style={group.iconUrl ? { backgroundImage: `url(${group.iconUrl})` } : undefined}
          >
            {!group.iconUrl && group.name.slice(0, 2).toUpperCase()}
          </span>
        </div>
        <Link href={`/public-group?slug=${group.slug}`} className="mt-2 block truncate text-base font-bold text-ink-900 hover:text-brand-600">
          {group.name}
        </Link>
        {group.description && <p className="mt-1 line-clamp-2 text-sm text-ink-500">{group.description}</p>}

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {group.category && <Badge tone="brand">{group.category}</Badge>}
          {group.visibility === 'private' && (
            <Badge tone="neutral">
              <Lock className="mr-1 h-3 w-3" /> Private
            </Badge>
          )}
          <span className="inline-flex items-center gap-1 text-xs text-ink-500">
            <Users className="h-3.5 w-3.5" /> {formatCount(group.memberCount)} members
          </span>
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-ink-100 pt-3">
          <Link
            href={`/sign-in?returnUrl=${encodeURIComponent(returnUrl)}`}
            className="flex-1 rounded-lg border border-ink-200 px-3 py-2 text-center text-xs font-semibold text-ink-700 hover:bg-ink-50"
          >
            Join group
          </Link>
          <Link
            href={`/public-group?slug=${group.slug}`}
            className="flex-1 rounded-lg bg-brand-600 px-3 py-2 text-center text-xs font-semibold text-white hover:bg-brand-700"
          >
            View group
          </Link>
        </div>
      </div>
    </div>
  );
}
