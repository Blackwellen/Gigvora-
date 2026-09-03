'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import axios from 'axios';
import { ArrowLeft, Download, Loader2, Lock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { usePostAnalytics, postAnalyticsExportUrl } from '@/hooks/usePostAnalytics';
import { getApiErrorMessage } from '@/lib/api';

const RANGE_PRESETS = [
  { key: '7d', label: 'Last 7 days', days: 7 },
  { key: '30d', label: 'Last 30 days', days: 30 },
] as const;

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  return d.toISOString().slice(0, 10);
}

export default function PostAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [preset, setPreset] = useState<(typeof RANGE_PRESETS)[number]['key']>('7d');
  const activePreset = RANGE_PRESETS.find((p) => p.key === preset)!;
  const startDate = isoDaysAgo(activePreset.days);
  const endDate = new Date().toISOString().slice(0, 10);

  const { data, isLoading, isError, error } = usePostAnalytics(id, { startDate, endDate });
  const isForbidden = axios.isAxiosError(error) && error.response?.status === 403;

  return (
    <div className="mx-auto max-w-[1000px] space-y-4 px-4 py-5 lg:px-6">
      <div className="flex items-center gap-3">
        <Link
          href="/app/live-feed"
          className="flex items-center gap-1.5 rounded-lg border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-sm font-semibold text-ink-600 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>
        <nav className="text-sm text-ink-400 dark:text-ink-500">
          <Link href="/app/live-feed" className="hover:underline">
            Home
          </Link>{' '}
          / <span className="text-ink-600 dark:text-ink-300">Post Analytics</span>
        </nav>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {isError && isForbidden && (
        <Card className="py-16 text-center">
          <Lock className="mx-auto h-6 w-6 text-ink-400" aria-hidden />
          <p className="mt-2 text-sm font-semibold text-ink-700 dark:text-ink-200">You don't have permission to view this</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">Only the post's author or an admin of its workspace can view analytics.</p>
        </Card>
      )}

      {isError && !isForbidden && (
        <Card className="py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Analytics not found</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error, "This post's analytics could not be loaded.")}</p>
        </Card>
      )}

      {data && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-xl font-bold tracking-[-0.01em] text-ink-900 dark:text-white">Post analytics</h1>
              <p className="text-sm text-ink-400 dark:text-ink-500">
                {format(new Date(data.range.startDate), 'MMM d')} – {format(new Date(data.range.endDate), 'MMM d, yyyy')} vs{' '}
                {format(new Date(data.comparisonRange.startDate), 'MMM d')} – {format(new Date(data.comparisonRange.endDate), 'MMM d')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                id="post-analytics-range"
                name="postAnalyticsRange"
                aria-label="Date range"
                value={preset}
                onChange={(e) => setPreset(e.target.value as typeof preset)}
                className="rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 px-3 py-2 text-sm font-semibold text-ink-700 dark:text-ink-200"
              >
                {RANGE_PRESETS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
              <a
                href={postAnalyticsExportUrl(id, { startDate, endDate })}
                download
                className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-ink-200 px-3 text-xs font-display font-semibold tracking-[-0.01em] text-ink-700 hover:border-ink-300 hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 dark:border-ink-700 dark:text-ink-200 dark:hover:border-ink-600 dark:hover:bg-ink-800"
              >
                <Download className="h-3.5 w-3.5" aria-hidden /> Export
              </a>
            </div>
          </div>

          <KpiStrip data={data} />

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink-900 dark:text-white">Performance over time</h3>
              <span className="text-xs text-ink-400 dark:text-ink-500">Impressions</span>
            </div>
            <PerformanceLineChart points={data.timeSeries} />
          </Card>
        </>
      )}
    </div>
  );
}

function pctLabel(value: number | null) {
  if (value === null) return null;
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value}%`;
}

function KpiStrip({ data }: { data: NonNullable<ReturnType<typeof usePostAnalytics>['data']> }) {
  const kpis: Array<{ label: string; value: string | number; change?: string | null }> = [
    { label: 'Impressions', value: data.kpis.impressions.toLocaleString(), change: pctLabel(data.changeVsPriorPeriod.impressions) },
    { label: 'Reach', value: data.kpis.reach.toLocaleString(), change: pctLabel(data.changeVsPriorPeriod.reach) },
    { label: 'Engagement rate', value: `${data.kpis.engagementRate}%` },
    { label: 'Reactions', value: data.kpis.reactions.toLocaleString() },
    { label: 'Comments', value: data.kpis.comments.toLocaleString() },
    { label: 'Shares', value: data.kpis.shares.toLocaleString() },
    { label: 'Saves', value: data.kpis.saves.toLocaleString() },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {kpis.map((k) => (
        <Card key={k.label} className="p-4">
          <p className="text-xs font-semibold text-ink-500 dark:text-ink-400">{k.label}</p>
          <p className="mt-1 font-display text-xl font-bold tracking-[-0.01em] text-ink-900 dark:text-white">{k.value}</p>
          {k.change && <p className={`mt-0.5 text-xs font-semibold ${k.change.startsWith('-') ? 'text-red-600' : 'text-emerald-600'}`}>{k.change}</p>}
        </Card>
      ))}
      {/* Clicks and Follower impact intentionally omitted — clicks has no
          meaningful click-tracking surface wired yet, and there is no
          follower-attribution table to trace a "follower impact" number
          back to this post. */}
    </div>
  );
}

function PerformanceLineChart({ points }: { points: Array<{ date: string; impressions: number }> }) {
  if (!points.length) return <p className="py-10 text-center text-sm text-ink-400">No data for this range yet.</p>;

  const width = 640;
  const height = 220;
  const padding = 32;
  const max = Math.max(1, ...points.map((p) => p.impressions));
  const stepX = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;

  const coords = points.map((p, i) => {
    const x = padding + i * stepX;
    const y = height - padding - (p.impressions / max) * (height - padding * 2);
    return { x, y, point: p };
  });
  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');

  const first = points[0];
  const last = points[points.length - 1];
  const peak = points.reduce((a, b) => (b.impressions > a.impressions ? b : a), points[0]);
  const trendSummary = `Impressions from ${format(new Date(first.date), 'MMM d')} to ${format(new Date(last.date), 'MMM d')}: started at ${first.impressions.toLocaleString()}, ended at ${last.impressions.toLocaleString()}, peaking at ${peak.impressions.toLocaleString()} on ${format(new Date(peak.date), 'MMM d')}.`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={trendSummary}>
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} className="stroke-ink-200 dark:stroke-ink-700" strokeWidth={1} />
      <path d={path} fill="none" className="stroke-brand-600 dark:stroke-brand-400" strokeWidth={2.5} />
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={3} className="fill-brand-600 dark:fill-brand-400" />
      ))}
      {coords.map((c, i) =>
        i === 0 || i === coords.length - 1 || i % Math.ceil(coords.length / 6) === 0 ? (
          <text key={`label-${i}`} x={c.x} y={height - padding + 16} textAnchor="middle" className="fill-ink-400 text-[10px] dark:fill-ink-500">
            {format(new Date(c.point.date), 'MMM d')}
          </text>
        ) : null
      )}
    </svg>
  );
}
