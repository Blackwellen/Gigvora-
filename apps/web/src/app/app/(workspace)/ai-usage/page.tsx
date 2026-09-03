'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Clock, Coins, Gauge, Hash, Info, Loader2, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import { useAiUsage, defaultAiUsageRange, type AiUsageDateRange, type AiUsageTrendPoint } from '@/hooks/useAiUsage';
import { CopilotNavStrip } from '@/components/copilot/CopilotNavStrip';

type SubTab = 'overview' | 'models' | 'tokens' | 'teams' | 'workflows' | 'users' | 'costs' | 'quality' | 'tools';

const REAL_TABS: Array<{ key: SubTab; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'models', label: 'Models' },
  { key: 'tokens', label: 'Tokens' },
];

const UNAVAILABLE_TABS: Array<{ key: SubTab; label: string }> = [
  { key: 'teams', label: 'Teams' },
  { key: 'workflows', label: 'Workflows' },
  { key: 'users', label: 'Users' },
  { key: 'costs', label: 'Costs' },
  { key: 'quality', label: 'Quality' },
  { key: 'tools', label: 'Tools' },
];

const DONUT_COLORS = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#0891b2'];
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

export default function AiUsagePage() {
  const [range, setRange] = useState<AiUsageDateRange>(() => defaultAiUsageRange());
  const [tab, setTab] = useState<SubTab>('overview');
  const { data, isLoading, isError } = useAiUsage(range);

  const byModel = data?.byModel ?? [];
  const trend = data?.trend ?? [];

  const insights = useMemo(() => buildInsights(data), [data]);

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink-900 dark:text-white">
            AI Usage
            <span title="Aggregates every real AI usage event your account has generated across the platform — Copilot generations, smart replies, conversation summaries and message safety checks.">
              <Info className="h-4.5 w-4.5 text-ink-300 dark:text-ink-600" />
            </span>
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Usage, cost and model activity across your AI features.</p>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-ink-500 dark:text-ink-400">
            From
            <input
              type="date"
              value={range.from}
              max={range.to}
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              className="h-9 rounded-control border border-ink-200 bg-white px-2 text-sm text-ink-800 outline-none focus:border-brand-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-ink-500 dark:text-ink-400">
            To
            <input
              type="date"
              value={range.to}
              min={range.from}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              className="h-9 rounded-control border border-ink-200 bg-white px-2 text-sm text-ink-800 outline-none focus:border-brand-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
            />
          </label>
        </div>
      </div>

      <CopilotNavStrip current="ai-usage" />

      {/* KPI strip */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiTile icon={TrendingUp} label="Total requests" value={isLoading ? '—' : (data?.totalRequests ?? 0).toLocaleString()} />
        <KpiTile icon={Hash} label="Tokens" value={isLoading ? '—' : (data?.totalTokens ?? 0).toLocaleString()} />
        <KpiTile icon={Coins} label="Total cost" value={isLoading ? '—' : currency.format(data?.totalCost ?? 0)} />
        <KpiTile icon={Gauge} label="Success rate" value={isLoading ? '—' : `${Math.round((data?.successRate ?? 0) * 100)}%`} />
        <KpiTile icon={Clock} label="Avg latency" value={isLoading ? '—' : `${Math.round(data?.avgLatencyMs ?? 0)} ms`} />
      </div>

      {isError && (
        <p className="mt-4 rounded-panel border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          Couldn't load usage data. Try again shortly.
        </p>
      )}

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 rounded-panel border border-ink-100 bg-white shadow-surface dark:border-ink-800 dark:bg-ink-900">
          <div role="tablist" className="flex flex-wrap items-center gap-1 border-b border-ink-100 px-2 dark:border-ink-800">
            {REAL_TABS.map((t) => (
              <TabButton key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
                {t.label}
              </TabButton>
            ))}
            {UNAVAILABLE_TABS.map((t) => (
              <TabButton key={t.key} active={tab === t.key} onClick={() => setTab(t.key)} muted>
                {t.label}
              </TabButton>
            ))}
          </div>

          <div className="p-5">
            {isLoading && (
              <div className="flex justify-center py-14">
                <Loader2 className="h-5 w-5 animate-spin text-ink-300" />
              </div>
            )}

            {!isLoading && tab === 'overview' && <OverviewTab trend={trend} byModel={byModel} />}
            {!isLoading && tab === 'models' && <ModelsTab byModel={byModel} />}
            {!isLoading && tab === 'tokens' && <TokensTab trend={trend} />}
            {!isLoading && (tab === 'teams' || tab === 'workflows' || tab === 'users' || tab === 'costs' || tab === 'quality' || tab === 'tools') && (
              <NotAvailableTab tab={tab} />
            )}
          </div>
        </div>

        {/* Right rail */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Insights & alerts" />
            {insights.length === 0 ? (
              <p className="px-5 pb-4 pt-2 text-xs text-ink-400 dark:text-ink-500">Nothing notable in the selected range.</p>
            ) : (
              <ul className="space-y-2 px-5 pb-4 pt-2">
                {insights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-xl border border-ink-100 p-2.5 text-xs dark:border-ink-800">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <span className="text-ink-600 dark:text-ink-300">{insight}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Recommended optimizations" action={<Badge tone="neutral">Coming soon</Badge>} />
            <p className="px-5 pb-4 pt-2 text-xs text-ink-400 dark:text-ink-500">
              There's no recommendation engine for AI usage yet — this card will surface cost/latency suggestions once that ships.
            </p>
          </Card>

          <Card>
            <CardHeader title="Recent milestones" action={<Badge tone="neutral">Coming soon</Badge>} />
            <p className="px-5 pb-4 pt-2 text-xs text-ink-400 dark:text-ink-500">
              Milestone tracking (e.g. "1,000th request") isn't implemented on the backend yet.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function buildInsights(data: ReturnType<typeof useAiUsage>['data']): string[] {
  if (!data) return [];
  const out: string[] = [];
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayPoint = data.trend.find((p) => p.day === todayKey);
  if (data.trend.length > 0 && (!todayPoint || todayPoint.requests === 0)) {
    out.push('No AI requests recorded today yet.');
  }
  if (data.avgLatencyMs > 4000) {
    out.push(`Average latency is ${Math.round(data.avgLatencyMs)}ms — higher than the typical 4s baseline.`);
  }
  if (data.totalRequests > 0 && data.successRate < 0.9) {
    out.push(`Success rate is ${Math.round(data.successRate * 100)}% — some requests are failing.`);
  }
  if (data.totalRequests === 0) {
    out.push('No AI activity recorded in the selected date range.');
  }
  return out;
}

function KpiTile({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-panel border border-ink-100 bg-white p-4 shadow-surface dark:border-ink-800 dark:bg-ink-900">
      <div className="flex items-center gap-1.5 text-ink-400 dark:text-ink-500">
        <Icon className="h-3.5 w-3.5" />
        <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-1.5 text-xl font-bold text-ink-900 dark:text-white">{value}</p>
    </div>
  );
}

function TabButton({ active, onClick, muted, children }: { active: boolean; onClick: () => void; muted?: boolean; children: React.ReactNode }) {
  return (
    <button
      role="tab"
      type="button"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-1.5 px-3.5 py-2.5 font-display text-sm font-semibold tracking-[-0.01em] transition-colors',
        active
          ? 'text-brand-700 dark:text-brand-400'
          : muted
          ? 'text-ink-300 hover:text-ink-500 dark:text-ink-700 dark:hover:text-ink-500'
          : 'text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-100'
      )}
    >
      {children}
      {active && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-600" />}
    </button>
  );
}

function NotAvailableTab({ tab }: { tab: SubTab }) {
  return (
    <div className="py-16 text-center">
      <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Not available yet</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">
        This platform doesn't track per-{tab === 'teams' ? 'team' : tab === 'workflows' ? 'workflow' : tab === 'users' ? 'user' : tab} AI usage yet.
      </p>
    </div>
  );
}

function OverviewTab({ trend, byModel }: { trend: AiUsageTrendPoint[]; byModel: { model: string; count: number }[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 font-display text-sm font-bold text-ink-900 dark:text-white">Usage trend</h3>
        <TrendChart trend={trend} />
      </div>
      <div>
        <h3 className="mb-3 font-display text-sm font-bold text-ink-900 dark:text-white">Model distribution</h3>
        <ModelDistribution byModel={byModel} />
      </div>
    </div>
  );
}

function ModelsTab({ byModel }: { byModel: { model: string; count: number }[] }) {
  if (byModel.length === 0) {
    return <p className="py-10 text-center text-sm text-ink-400 dark:text-ink-500">No model usage recorded in this date range.</p>;
  }
  const total = byModel.reduce((sum, m) => sum + m.count, 0);
  return (
    <div className="space-y-6">
      <ModelDistribution byModel={byModel} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-left">
          <thead>
            <tr className="border-b border-ink-100 text-xs font-semibold uppercase tracking-wide text-ink-400 dark:border-ink-800 dark:text-ink-500">
              <th className="px-2 py-2">Model</th>
              <th className="px-2 py-2">Requests</th>
              <th className="px-2 py-2">Share</th>
            </tr>
          </thead>
          <tbody>
            {byModel
              .slice()
              .sort((a, b) => b.count - a.count)
              .map((m) => (
                <tr key={m.model} className="border-b border-ink-50 last:border-b-0 dark:border-ink-800/60">
                  <td className="px-2 py-2.5 text-sm font-semibold text-ink-800 dark:text-ink-100">{m.model}</td>
                  <td className="px-2 py-2.5 text-sm text-ink-600 dark:text-ink-300">{m.count.toLocaleString()}</td>
                  <td className="px-2 py-2.5 text-sm text-ink-600 dark:text-ink-300">{total > 0 ? Math.round((m.count / total) * 100) : 0}%</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TokensTab({ trend }: { trend: AiUsageTrendPoint[] }) {
  if (trend.length === 0) {
    return <p className="py-10 text-center text-sm text-ink-400 dark:text-ink-500">No token data recorded in this date range.</p>;
  }
  const totalTokens = trend.reduce((sum, p) => sum + p.tokens, 0);
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-500 dark:text-ink-400">
        {totalTokens.toLocaleString()} tokens across {trend.length} day{trend.length === 1 ? '' : 's'}.
      </p>
      <TokenBarChart trend={trend} />
    </div>
  );
}

function ModelDistribution({ byModel }: { byModel: { model: string; count: number }[] }) {
  if (byModel.length === 0) {
    return <p className="text-xs text-ink-400 dark:text-ink-500">No model usage data available yet for this range.</p>;
  }
  const breakdown: Array<[string, number]> = byModel.map((m) => [m.model, m.count]);
  return (
    <div className="flex items-center gap-4">
      <ModelDonut breakdown={breakdown} />
      <ul className="min-w-0 flex-1 space-y-1.5">
        {breakdown.map(([model, count], i) => (
          <li key={model} className="flex items-center gap-1.5 text-xs">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            <span className="min-w-0 flex-1 truncate text-ink-600 dark:text-ink-300">{model}</span>
            <span className="font-semibold text-ink-800 dark:text-ink-100">{count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ModelDonut({ breakdown }: { breakdown: Array<[string, number]> }) {
  const total = breakdown.reduce((sum, [, c]) => sum + c, 0) || 1;
  let cursor = 0;
  const stops = breakdown.map(([, count], i) => {
    const start = (cursor / total) * 360;
    cursor += count;
    const end = (cursor / total) * 360;
    return `${DONUT_COLORS[i % DONUT_COLORS.length]} ${start}deg ${end}deg`;
  });
  return (
    <div
      className="relative h-20 w-20 shrink-0 rounded-full"
      style={{ background: `conic-gradient(${stops.join(', ')})` }}
      role="img"
      aria-label={`Model usage: ${breakdown.map(([m, c]) => `${m} ${c}`).join(', ')}`}
    >
      <div className="absolute inset-2 flex items-center justify-center rounded-full bg-white text-xs font-bold text-ink-800 dark:bg-ink-900 dark:text-ink-100">
        {total}
      </div>
    </div>
  );
}

/** Simple dual-line SVG chart — no charting library is installed in this codebase, and adding one
 * for two charts isn't warranted (mirrors the conic-gradient donut approach already used on
 * /app/chat-sessions for the same reason). */
function TrendChart({ trend }: { trend: AiUsageTrendPoint[] }) {
  if (trend.length === 0) {
    return <p className="text-xs text-ink-400 dark:text-ink-500">No usage trend data available yet for this range.</p>;
  }
  const width = 640;
  const height = 180;
  const padding = 24;
  const maxRequests = Math.max(1, ...trend.map((p) => p.requests));
  const maxTokens = Math.max(1, ...trend.map((p) => p.tokens));
  const stepX = trend.length > 1 ? (width - padding * 2) / (trend.length - 1) : 0;

  const pointsFor = (accessor: (p: AiUsageTrendPoint) => number, max: number) =>
    trend
      .map((p, i) => {
        const x = padding + i * stepX;
        const y = height - padding - (accessor(p) / max) * (height - padding * 2);
        return `${x},${y}`;
      })
      .join(' ');

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Requests and tokens over time">
        <polyline points={pointsFor((p) => p.requests, maxRequests)} fill="none" stroke="#7c3aed" strokeWidth={2} />
        <polyline points={pointsFor((p) => p.tokens, maxTokens)} fill="none" stroke="#2563eb" strokeWidth={2} strokeDasharray="4 3" />
      </svg>
      <div className="mt-2 flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5 text-ink-500 dark:text-ink-400">
          <span className="h-2 w-4 rounded-full bg-violet-600" /> Requests
        </span>
        <span className="flex items-center gap-1.5 text-ink-500 dark:text-ink-400">
          <span className="h-0.5 w-4 border-t-2 border-dashed border-blue-600" /> Tokens
        </span>
      </div>
    </div>
  );
}

function TokenBarChart({ trend }: { trend: AiUsageTrendPoint[] }) {
  const max = Math.max(1, ...trend.map((p) => p.tokens));
  return (
    <div className="flex h-40 items-end gap-1 overflow-x-auto">
      {trend.map((p) => (
        <div key={p.day} className="flex min-w-[10px] flex-1 flex-col items-center gap-1" title={`${p.day}: ${p.tokens.toLocaleString()} tokens`}>
          <div
            className="w-full rounded-t bg-brand-500/80"
            style={{ height: `${Math.max(2, (p.tokens / max) * 140)}px` }}
          />
        </div>
      ))}
    </div>
  );
}
