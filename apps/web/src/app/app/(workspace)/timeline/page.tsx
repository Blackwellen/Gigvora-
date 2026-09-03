'use client';

import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { ProfessionalProfileShell } from '@/components/profile/ProfessionalProfileShell';
import { ProfileRightRailCard } from '@/components/profile/ProfileRightRailCard';
import { FeedShell } from '@/components/feed/FeedShell';
import { api } from '@/lib/api';

type TimelineSummary = { available: true; summary: string; bullets: string[] } | { available: false; reason: string };
type PortfolioItem = { id: string; title: string; role: string | null; status: string; assets: Array<{ url: string }> };

export default function TimelinePage() {
  const { data: summary } = useQuery({
    queryKey: ['professional-profile', 'insights', 'timeline-summary'],
    queryFn: async () => (await api.get<{ data: TimelineSummary }>('/professional-profile/me/insights/timeline-summary')).data.data,
  });
  const { data: portfolio } = useQuery({
    queryKey: ['professional-profile', 'portfolio', 'featured'],
    queryFn: async () => (await api.get<{ data: PortfolioItem[] }>('/professional-profile/me/portfolio', { params: { status: 'published' } })).data.data,
  });

  const featured = (portfolio || []).slice(0, 3);

  return (
    <ProfessionalProfileShell
      active="timeline"
      rightRail={
        <>
          <ProfileRightRailCard title="Featured work">
            {featured.length === 0 ? (
              <p className="text-sm text-ink-400 dark:text-ink-500">Add portfolio items to feature your best work here.</p>
            ) : (
              <ul className="space-y-3">
                {featured.map((item) => (
                  <li key={item.id} className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-ink-100 dark:bg-ink-800">
                      {item.assets[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.assets[0].url} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-800 dark:text-ink-100">{item.title}</p>
                      {item.role && <p className="truncate text-xs text-ink-400 dark:text-ink-500">{item.role}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </ProfileRightRailCard>

          <ProfileRightRailCard title="AI timeline summary" beta action={<Sparkles className="h-4 w-4 text-purple-500" />}>
            {!summary ? (
              <p className="text-sm text-ink-400 dark:text-ink-500">Loading…</p>
            ) : summary.available ? (
              <div className="space-y-2">
                <p className="text-sm text-ink-600 dark:text-ink-300">{summary.summary}</p>
                <ul className="space-y-1 text-xs text-ink-500 dark:text-ink-400">
                  {summary.bullets.map((b) => (
                    <li key={b}>• {b}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-ink-400 dark:text-ink-500">{summary.reason}</p>
            )}
          </ProfileRightRailCard>
        </>
      }
    >
      <FeedShell
        tabs={[{ key: 'mine', label: 'Timeline' }]}
        initialTab="mine"
        emptyTitle="No posts yet"
        emptyBody={() => 'Share an update, project win or milestone to start building your Timeline.'}
      />
    </ProfessionalProfileShell>
  );
}
