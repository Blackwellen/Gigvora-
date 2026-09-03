'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, Megaphone, Pause, Play, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { useAdCampaigns, usePauseAdCampaign, useResumeAdCampaign, type AdCampaign, type AdCampaignStatus } from '@/hooks/useAds';
import { STATUS_LABEL, STATUS_TONE, OBJECTIVE_LABEL } from '../adsShared';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const cents = (v: number) => currency.format(v / 100);

type TabKey = 'all' | AdCampaignStatus;

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'pending_review', label: 'Pending review' },
  { key: 'active', label: 'Active' },
  { key: 'paused', label: 'Paused' },
  { key: 'completed', label: 'Completed' },
  { key: 'rejected', label: 'Rejected' },
];

export default function AdCampaignsListPage() {
  const { data: campaigns, isLoading, isError } = useAdCampaigns();
  const [tab, setTab] = useState<TabKey>('all');

  const all = campaigns ?? [];
  const counts = useMemo(() => {
    const map: Record<string, number> = { all: all.length };
    for (const c of all) map[c.status] = (map[c.status] ?? 0) + 1;
    return map;
  }, [all]);

  const filtered = useMemo(() => (tab === 'all' ? all : all.filter((c) => c.status === tab)), [all, tab]);

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Campaigns</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Every ad campaign on your account, with real budgets and real spend.</p>
        </div>
        <Link href="/app/gigvora-ads/campaigns/new">
          <Button>
            <Plus className="h-4 w-4" /> Create campaign
          </Button>
        </Link>
      </div>

      <div role="tablist" className="mt-5 flex flex-wrap items-center gap-1 border-b border-ink-100 dark:border-ink-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'relative flex items-center gap-1.5 px-3.5 py-2.5 font-display text-sm font-semibold tracking-[-0.01em] transition-colors',
              tab === t.key ? 'text-brand-700 dark:text-brand-400' : 'text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-100'
            )}
          >
            {t.label} <span className="text-xs font-normal text-ink-400 dark:text-ink-500">{counts[t.key] ?? 0}</span>
            {tab === t.key && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-600" />}
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-panel border border-ink-100 bg-white shadow-surface dark:border-ink-800 dark:bg-ink-900">
        {isError && (
          <p className="p-5 text-sm text-red-600 dark:text-red-400">Couldn't load your campaigns. Try again shortly.</p>
        )}

        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-ink-300" />
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-100 text-ink-400 dark:bg-ink-800 dark:text-ink-500">
              <Megaphone className="h-6 w-6" />
            </span>
            <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">
              {tab === 'all' ? 'No campaigns yet' : `No ${STATUS_LABEL[tab as AdCampaignStatus]?.toLowerCase() ?? tab} campaigns`}
            </p>
            {tab === 'all' && (
              <Link href="/app/gigvora-ads/campaigns/new">
                <Button size="sm">
                  <Plus className="h-3.5 w-3.5" /> Create campaign
                </Button>
              </Link>
            )}
          </div>
        )}

        {!isLoading && !isError && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-left">
              <thead>
                <tr className="border-b border-ink-100 text-xs font-semibold uppercase tracking-wide text-ink-400 dark:border-ink-800 dark:text-ink-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Objective</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Daily budget</th>
                  <th className="px-4 py-3">Total budget</th>
                  <th className="px-4 py-3">Spent</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <CampaignRow key={c.id} campaign={c} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function CampaignRow({ campaign }: { campaign: AdCampaign }) {
  const pause = usePauseAdCampaign();
  const resume = useResumeAdCampaign();

  const pct = campaign.totalBudgetCents > 0 ? Math.min(100, Math.round((campaign.spentCents / campaign.totalBudgetCents) * 100)) : 0;
  const canPause = campaign.status === 'active' || campaign.status === 'pending_review';
  const canResume = campaign.status === 'paused';
  const budgetExhausted = campaign.spentCents >= campaign.totalBudgetCents;

  return (
    <tr className="border-b border-ink-50 last:border-b-0 dark:border-ink-800/60">
      <td className="px-4 py-3">
        <Link href={`/app/gigvora-ads/campaigns/${campaign.id}`} className="text-sm font-semibold text-ink-900 hover:text-brand-600 dark:text-white">
          {campaign.name}
        </Link>
      </td>
      <td className="px-4 py-3 text-sm text-ink-600 dark:text-ink-300">{OBJECTIVE_LABEL[campaign.objective]}</td>
      <td className="px-4 py-3">
        <Badge tone={STATUS_TONE[campaign.status]}>{STATUS_LABEL[campaign.status]}</Badge>
      </td>
      <td className="px-4 py-3 text-sm text-ink-600 dark:text-ink-300">{cents(campaign.dailyBudgetCents)}</td>
      <td className="px-4 py-3 text-sm text-ink-600 dark:text-ink-300">{cents(campaign.totalBudgetCents)}</td>
      <td className="px-4 py-3">
        <div className="w-32">
          <div className="flex items-center justify-between text-xs text-ink-500 dark:text-ink-400">
            <span>{cents(campaign.spentCents)}</span>
            <span>{pct}%</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
            <div className={cn('h-full rounded-full', budgetExhausted ? 'bg-amber-500' : 'bg-brand-500')} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1.5">
          {canPause && (
            <Button size="sm" variant="outline" onClick={() => pause.mutate(campaign.id)} disabled={pause.isPending}>
              <Pause className="h-3.5 w-3.5" /> Pause
            </Button>
          )}
          {canResume && (
            <Button size="sm" variant="outline" onClick={() => resume.mutate(campaign.id)} disabled={resume.isPending || budgetExhausted} title={budgetExhausted ? 'Total budget exhausted — increase it before resuming' : undefined}>
              <Play className="h-3.5 w-3.5" /> Resume
            </Button>
          )}
          <Link href={`/app/gigvora-ads/campaigns/${campaign.id}`}>
            <Button size="sm" variant="ghost">
              View
            </Button>
          </Link>
        </div>
        {resume.isError && <p className="mt-1 text-right text-[11px] text-red-500">Could not resume — budget exhausted.</p>}
      </td>
    </tr>
  );
}
