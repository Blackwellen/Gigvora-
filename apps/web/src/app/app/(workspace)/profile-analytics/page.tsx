'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Loader2, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { ProfessionalProfileShell } from '@/components/profile/ProfessionalProfileShell';
import { ProfileRightRailCard } from '@/components/profile/ProfileRightRailCard';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';

type Series = {
  days: number;
  daily: Array<{ date: string; profileViews: number; searchAppearances: number; recruiterViews: number; portfolioClicks: number }>;
  totals: Record<string, number>;
  viewsChangePct: number | null;
  benchmark: string | null;
  cohortSampleSize: number | null;
};
type AnalyticsSummary = { available: true; bullets: string[] } | { available: false; reason: string };

const RANGES = [7, 30, 90];

function Sparkbars({ data }: { data: Array<{ date: string; profileViews: number }> }) {
  const max = Math.max(1, ...data.map((d) => d.profileViews));
  return (
    <div className="flex h-32 items-end gap-1">
      {data.map((d) => (
        <div key={d.date} className="group relative flex-1">
          <div className="rounded-t bg-brand-500/80 transition-colors group-hover:bg-brand-600" style={{ height: `${Math.max(2, (d.profileViews / max) * 100)}%` }} />
          <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-ink-900 px-1.5 py-0.5 text-[10px] text-white opacity-0 group-hover:opacity-100">
            {d.profileViews} on {new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ProfileAnalyticsPage() {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useQuery({
    queryKey: ['professional-profile', 'analytics', days],
    queryFn: async () => (await api.get<{ data: Series }>('/professional-profile/me/analytics', { params: { days } })).data.data,
  });
  const { data: summary } = useQuery({
    queryKey: ['professional-profile', 'insights', 'analytics-summary'],
    queryFn: async () => (await api.get<{ data: AnalyticsSummary }>('/professional-profile/me/insights/analytics-summary')).data.data,
  });

  return (
    <ProfessionalProfileShell
      rightRail={
        <>
          <ProfileRightRailCard title="AI analytics summary" beta action={<Sparkles className="h-4 w-4 text-purple-500" />}>
            {!summary ? (
              <p className="text-sm text-ink-400 dark:text-ink-500">Loading…</p>
            ) : summary.available ? (
              <ul className="space-y-1.5 text-sm text-ink-600 dark:text-ink-300">
                {summary.bullets.map((b) => (
                  <li key={b}>• {b}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-400 dark:text-ink-500">{summary.reason}</p>
            )}
          </ProfileRightRailCard>
          <ProfileRightRailCard title="Benchmark">
            <p className="text-sm text-ink-400 dark:text-ink-500">
              {data?.benchmark ?? 'Not enough peer data in your cohort yet to show a percentile benchmark.'}
            </p>
          </ProfileRightRailCard>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink-900 dark:text-white">
            <BarChart3 className="h-4 w-4" /> Profile Analytics
          </h2>
          <div className="flex gap-1 rounded-lg border border-ink-200 p-1 dark:border-ink-700">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setDays(r)}
                className={`rounded px-2.5 py-1 text-xs font-semibold ${days === r ? 'bg-brand-600 text-white' : 'text-ink-500 dark:text-ink-400'}`}
              >
                {r}d
              </button>
            ))}
          </div>
        </div>

        {isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        )}

        {data && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KpiTile label="Profile views" value={data.totals.profileViews} />
              <KpiTile label="Search appearances" value={data.totals.searchAppearances} />
              <KpiTile label="Recruiter views" value={data.totals.recruiterViews} />
              <KpiTile label="Portfolio clicks" value={data.totals.portfolioClicks} />
            </div>

            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-sm font-bold text-ink-900 dark:text-white">Profile views over time</h3>
                {data.viewsChangePct != null && (
                  <span className={`flex items-center gap-1 text-xs font-semibold ${data.viewsChangePct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {data.viewsChangePct >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    {Math.abs(data.viewsChangePct)}% vs previous period
                  </span>
                )}
              </div>
              {data.daily.length === 0 ? (
                <p className="py-10 text-center text-sm text-ink-400 dark:text-ink-500">No analytics recorded for this period yet.</p>
              ) : (
                <Sparkbars data={data.daily} />
              )}
            </Card>
          </>
        )}
      </div>
    </ProfessionalProfileShell>
  );
}

function KpiTile({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <p className="font-display text-2xl font-bold text-ink-900 dark:text-white">{value.toLocaleString()}</p>
      <p className="text-xs text-ink-400 dark:text-ink-500">{label}</p>
    </Card>
  );
}
