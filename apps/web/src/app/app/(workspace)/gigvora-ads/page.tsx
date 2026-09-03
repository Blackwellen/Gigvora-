'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Coins, TrendingUp, FileEdit, CheckCircle2, Loader2, Megaphone, CreditCard, Plus } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAdAccount, useAdCampaigns, useAdBillingHistory, useCreateAdsBillingPortal, type AdCampaignStatus } from '@/hooks/useAds';
import { getApiErrorMessage } from '@/lib/api';
import { STATUS_TONE, STATUS_LABEL, OBJECTIVE_LABEL } from './adsShared';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const cents = (v: number) => currency.format(v / 100);

export default function GigvoraAdsDashboardPage() {
  const { data: account, isLoading: accountLoading, isError: accountError } = useAdAccount();
  const { data: campaigns, isLoading: campaignsLoading } = useAdCampaigns();
  const { data: billing, isLoading: billingLoading } = useAdBillingHistory(8);
  const createPortal = useCreateAdsBillingPortal();

  const counts = account?.campaignCounts ?? {};
  const totalCampaigns = campaigns?.length ?? 0;
  const recentCampaigns = useMemo(
    () => [...(campaigns ?? [])].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 8),
    [campaigns]
  );

  async function manageBilling() {
    try {
      const { url } = await createPortal.mutateAsync(typeof window !== 'undefined' ? window.location.href : undefined);
      window.location.href = url;
    } catch {
      // surfaced inline below via createPortal.isError
    }
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink-900 dark:text-white">
            <Megaphone className="h-6 w-6 text-brand-600" /> Gigvora Ads
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            Promote your own posts, jobs and company page to the right audience — real budgets, real spend, real billing.
          </p>
        </div>
        <Link href="/app/gigvora-ads/campaigns/new">
          <Button>
            <Plus className="h-4 w-4" /> Create campaign
          </Button>
        </Link>
      </div>

      {accountError && (
        <p className="mt-4 rounded-panel border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          Couldn't load your ad account. Try again shortly.
        </p>
      )}

      {/* KPI strip */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiTile icon={Coins} label="Lifetime spend" value={accountLoading ? '—' : cents(account?.lifetimeSpendCents ?? 0)} />
        <KpiTile icon={TrendingUp} label="Spend today" value={accountLoading ? '—' : cents(account?.spendTodayCents ?? 0)} />
        <KpiTile icon={TrendingUp} label="Spend this month" value={accountLoading ? '—' : cents(account?.spendThisMonthCents ?? 0)} />
        <KpiTile icon={Megaphone} label="Active campaigns" value={accountLoading ? '—' : String(counts.active ?? 0)} />
        <KpiTile icon={FileEdit} label="Draft campaigns" value={accountLoading ? '—' : String(counts.draft ?? 0)} />
        <KpiTile icon={CheckCircle2} label="Completed" value={accountLoading ? '—' : String(counts.completed ?? 0)} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        {/* Recent campaigns */}
        <Card>
          <CardHeader
            title="Recent campaigns"
            action={
              <Link href="/app/gigvora-ads/campaigns" className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">
                View all
              </Link>
            }
          />
          <div className="p-5 pt-3">
            {campaignsLoading && (
              <div className="flex justify-center py-14">
                <Loader2 className="h-5 w-5 animate-spin text-ink-300" />
              </div>
            )}

            {!campaignsLoading && totalCampaigns === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                  <Megaphone className="h-6 w-6" />
                </span>
                <div>
                  <p className="font-display text-base font-bold text-ink-900 dark:text-white">Create your first campaign</p>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500 dark:text-ink-400">
                    Promote a post, a job you posted, or your company page to reach a targeted audience.
                  </p>
                </div>
                <Link href="/app/gigvora-ads/campaigns/new">
                  <Button>
                    <Plus className="h-4 w-4" /> Create campaign
                  </Button>
                </Link>
              </div>
            )}

            {!campaignsLoading && totalCampaigns > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-ink-100 text-xs font-semibold uppercase tracking-wide text-ink-400 dark:border-ink-800 dark:text-ink-500">
                      <th className="px-2 py-2">Name</th>
                      <th className="px-2 py-2">Objective</th>
                      <th className="px-2 py-2">Status</th>
                      <th className="px-2 py-2">Spent</th>
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {recentCampaigns.map((c) => (
                      <tr key={c.id} className="border-b border-ink-50 last:border-b-0 dark:border-ink-800/60">
                        <td className="px-2 py-2.5 text-sm font-semibold text-ink-800 dark:text-ink-100">{c.name}</td>
                        <td className="px-2 py-2.5 text-sm text-ink-600 dark:text-ink-300">{OBJECTIVE_LABEL[c.objective]}</td>
                        <td className="px-2 py-2.5">
                          <Badge tone={STATUS_TONE[c.status as AdCampaignStatus]}>{STATUS_LABEL[c.status as AdCampaignStatus]}</Badge>
                        </td>
                        <td className="px-2 py-2.5 text-sm text-ink-600 dark:text-ink-300">
                          {cents(c.spentCents)} / {cents(c.totalBudgetCents)}
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          <Link href={`/app/gigvora-ads/campaigns/${c.id}`} className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>

        {/* Billing */}
        <Card>
          <CardHeader
            title="Billing"
            action={
              <Button size="sm" variant="outline" onClick={manageBilling} disabled={createPortal.isPending}>
                <CreditCard className="h-3.5 w-3.5" /> {createPortal.isPending ? 'Opening…' : 'Manage payment method'}
              </Button>
            }
          />
          <div className="px-5 pb-5 pt-3">
            {createPortal.isError && (
              <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400">
                {getApiErrorMessage(createPortal.error, "Couldn't open the billing portal. Try again.")}
              </p>
            )}
            <p className="mb-3 text-xs text-ink-500 dark:text-ink-400">
              Ad spend is billed to the same Stripe payment method as your platform subscription.
            </p>

            {billingLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-ink-300" />
              </div>
            )}

            {!billingLoading && (billing?.length ?? 0) === 0 && (
              <p className="py-6 text-center text-xs text-ink-400 dark:text-ink-500">No billing activity yet.</p>
            )}

            {!billingLoading && (billing?.length ?? 0) > 0 && (
              <ul className="space-y-2">
                {billing!.map((event) => (
                  <li key={event.id} className="flex items-center justify-between gap-2 rounded-lg border border-ink-100 px-3 py-2 text-xs dark:border-ink-800">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink-800 dark:text-ink-100">{billingEventLabel(event.type)}</p>
                      <p className="text-ink-400 dark:text-ink-500">{new Date(event.createdAt).toLocaleString()}</p>
                    </div>
                    <span className={event.type === 'charge_failed' ? 'font-semibold text-red-600 dark:text-red-400' : 'font-semibold text-ink-700 dark:text-ink-200'}>
                      {cents(event.amountCents)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function billingEventLabel(type: string) {
  if (type === 'spend_accrued') return 'Spend accrued';
  if (type === 'charge_collected') return 'Charge collected';
  if (type === 'charge_failed') return 'Charge failed';
  return type;
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
