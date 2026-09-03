'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { ProfessionalProfileHero } from './ProfessionalProfileHero';
import { ProfessionalProfileTabs } from './ProfessionalProfileTabs';
import { fetchHero, PROFILE_HERO_KEY, type ProfileTabKey } from '@/lib/professionalProfile/api';

/**
 * Canonical Domain 14 shell: one cover/avatar hero + one tab bar shared by
 * every profile route (§1, §6). Route pages provide only their tab content
 * (`children`) and, optionally, right-rail cards.
 */
export function ProfessionalProfileShell({
  active,
  children,
  rightRail,
}: {
  active?: ProfileTabKey;
  children: React.ReactNode;
  rightRail?: React.ReactNode;
}) {
  const { data: hero, isLoading, isError, refetch } = useQuery({ queryKey: PROFILE_HERO_KEY, queryFn: fetchHero });

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-5 lg:px-8">
      {isLoading && (
        <div className="flex h-64 items-center justify-center rounded-panel border border-ink-100 bg-white dark:border-ink-800 dark:bg-ink-900">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {isError && !isLoading && (
        <div className="flex flex-col items-center gap-3 rounded-panel border border-dashed border-red-200 bg-red-50/40 py-16 text-center dark:border-red-500/30 dark:bg-red-500/5">
          <AlertTriangle className="h-6 w-6 text-red-500" />
          <p className="text-sm font-semibold text-ink-800 dark:text-ink-100">Couldn&rsquo;t load your professional profile</p>
          <button type="button" onClick={() => refetch()} className="text-sm font-semibold text-brand-600 hover:underline">
            Try again
          </button>
        </div>
      )}

      {hero && (
        <div className="space-y-4">
          <ProfessionalProfileHero hero={hero} />
          <div className="rounded-panel border border-ink-100/80 bg-white px-2 shadow-surface dark:border-ink-800/80 dark:bg-ink-900">
            <ProfessionalProfileTabs active={active} />
          </div>

          <div className={rightRail ? 'grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]' : ''}>
            <div className="min-w-0">{children}</div>
            {rightRail && (
              <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">{rightRail}</aside>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
