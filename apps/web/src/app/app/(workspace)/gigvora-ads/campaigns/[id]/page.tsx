'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, MousePointerClick, Eye, Percent, Coins, Pause, Play, Save, AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/cn';
import { getApiErrorMessage } from '@/lib/api';
import {
  useAdCampaign,
  usePauseAdCampaign,
  useResumeAdCampaign,
  useUpdateAdCampaign,
  type AdTargeting,
} from '@/hooks/useAds';
import { STATUS_LABEL, STATUS_TONE, OBJECTIVE_LABEL, OBJECTIVE_SHORT_LABEL } from '../../adsShared';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const cents = (v: number) => currency.format(v / 100);

export default function AdCampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: campaign, isLoading, isError } = useAdCampaign(id);
  const pause = usePauseAdCampaign();
  const resume = useResumeAdCampaign();

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-ink-300" />
      </div>
    );
  }

  if (isError || !campaign) {
    return (
      <div className="mx-auto max-w-[900px] px-4 py-10 text-center">
        <p className="text-sm text-red-600 dark:text-red-400">Couldn't load this campaign.</p>
        <Link href="/app/gigvora-ads/campaigns" className="mt-3 inline-block text-sm font-semibold text-brand-600 hover:text-brand-700">
          Back to campaigns
        </Link>
      </div>
    );
  }

  const canPause = campaign.status === 'active' || campaign.status === 'pending_review';
  const canResume = campaign.status === 'paused';
  const budgetExhausted = campaign.spentCents >= campaign.totalBudgetCents;
  const pct = campaign.totalBudgetCents > 0 ? Math.min(100, Math.round((campaign.spentCents / campaign.totalBudgetCents) * 100)) : 0;

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-6 lg:px-6">
      <Link href="/app/gigvora-ads/campaigns" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-100">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to campaigns
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-ink-900 dark:text-white">{campaign.name}</h1>
            <Badge tone={STATUS_TONE[campaign.status]}>{STATUS_LABEL[campaign.status]}</Badge>
          </div>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{OBJECTIVE_LABEL[campaign.objective]}</p>
        </div>
        <div className="flex items-center gap-2">
          {canPause && (
            <Button variant="outline" onClick={() => pause.mutate(campaign.id)} disabled={pause.isPending}>
              {pause.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4" />} Pause
            </Button>
          )}
          {canResume && (
            <Button onClick={() => resume.mutate(campaign.id)} disabled={resume.isPending || budgetExhausted} title={budgetExhausted ? 'Total budget exhausted — increase it before resuming' : undefined}>
              {resume.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Resume
            </Button>
          )}
        </div>
      </div>
      {resume.isError && (
        <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">{getApiErrorMessage(resume.error, 'Could not resume this campaign.')}</p>
      )}
      {pause.isError && (
        <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">{getApiErrorMessage(pause.error, 'Could not pause this campaign.')}</p>
      )}

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {/* Performance */}
          <Card>
            <CardHeader title="Performance" />
            <div className="grid grid-cols-2 gap-3 p-5 pt-3 sm:grid-cols-4">
              <MetricTile icon={Eye} label="Impressions" value={campaign.performance.impressions.toLocaleString()} />
              <MetricTile icon={MousePointerClick} label="Clicks" value={campaign.performance.clicks.toLocaleString()} />
              <MetricTile icon={Percent} label="CTR" value={`${campaign.performance.ctr}%`} />
              <MetricTile icon={Coins} label="Spend" value={cents(campaign.performance.spendFromImpressionsCents + campaign.performance.spendFromClicksCents)} />
            </div>
            <div className="grid grid-cols-1 gap-2 px-5 pb-5 text-xs text-ink-500 dark:text-ink-400 sm:grid-cols-2">
              <p>From impressions: {cents(campaign.performance.spendFromImpressionsCents)}</p>
              <p>From clicks: {cents(campaign.performance.spendFromClicksCents)}</p>
            </div>
          </Card>

          {/* Budget */}
          <BudgetSection campaign={campaign} />

          {/* Targeting */}
          <TargetingSection campaign={campaign} />
        </div>

        <div className="space-y-5">
          {/* Creative / review status */}
          <Card>
            <CardHeader title="Creative" />
            <div className="space-y-3 px-5 pb-5 pt-3 text-sm">
              {campaign.creative ? (
                <>
                  <p className="text-ink-600 dark:text-ink-300">
                    Promoting: <span className="font-semibold text-ink-900 dark:text-white">{OBJECTIVE_SHORT_LABEL[campaign.objective]}</span>
                  </p>
                  {campaign.objective === 'post_engagement' ? (
                    <Link href={`/app/post-detail/${campaign.creative.contentId}`} className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">
                      View the post
                    </Link>
                  ) : (
                    <p className="text-xs text-ink-400 dark:text-ink-500">
                      {campaign.creative.contentType} · id {campaign.creative.contentId}
                    </p>
                  )}
                  {campaign.creative.headline && <p className="text-sm text-ink-700 dark:text-ink-200">Headline: {campaign.creative.headline}</p>}
                  {campaign.creative.destinationUrl && <p className="break-all text-xs text-ink-500 dark:text-ink-400">Destination: {campaign.creative.destinationUrl}</p>}

                  <ReviewStatusBadge status={campaign.creative.reviewStatus} rejectionReason={campaign.creative.rejectionReason} />
                </>
              ) : (
                <p className="text-xs text-ink-400 dark:text-ink-500">No creative on this campaign.</p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Details" />
            <div className="space-y-1.5 px-5 pb-5 pt-3 text-xs text-ink-500 dark:text-ink-400">
              <p>Started {campaign.startDate}</p>
              <p>{campaign.endDate ? `Ends ${campaign.endDate}` : 'No end date'}</p>
              <p>Created {new Date(campaign.createdAt).toLocaleDateString()}</p>
              <p>Last updated {new Date(campaign.updatedAt).toLocaleDateString()}</p>
              <p>Rate: {cents(campaign.costPerImpressionCents)} / impression · {cents(campaign.costPerClickCents)} / click</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ReviewStatusBadge({ status, rejectionReason }: { status: string; rejectionReason: string | null }) {
  if (status === 'approved') {
    return (
      <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" /> Approved
      </p>
    );
  }
  if (status === 'rejected') {
    return (
      <div className="space-y-1">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
          <XCircle className="h-3.5 w-3.5" /> Rejected
        </p>
        {rejectionReason && <p className="text-xs text-ink-500 dark:text-ink-400">{rejectionReason}</p>}
      </div>
    );
  }
  return (
    <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
      <Clock className="h-3.5 w-3.5" /> Pending review
    </p>
  );
}

function MetricTile({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-100 p-3 dark:border-ink-800">
      <div className="flex items-center gap-1.5 text-ink-400 dark:text-ink-500">
        <Icon className="h-3.5 w-3.5" />
        <p className="text-[11px] font-semibold uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-1 text-lg font-bold text-ink-900 dark:text-white">{value}</p>
    </div>
  );
}

function BudgetSection({ campaign }: { campaign: NonNullable<ReturnType<typeof useAdCampaign>['data']> }) {
  const update = useUpdateAdCampaign();
  const [editing, setEditing] = useState(false);
  const [dailyBudget, setDailyBudget] = useState(String(campaign.dailyBudgetCents / 100));
  const [totalBudget, setTotalBudget] = useState(String(campaign.totalBudgetCents / 100));
  const [endDate, setEndDate] = useState(campaign.endDate ?? '');

  const pct = campaign.totalBudgetCents > 0 ? Math.min(100, Math.round((campaign.spentCents / campaign.totalBudgetCents) * 100)) : 0;
  const budgetExhausted = campaign.spentCents >= campaign.totalBudgetCents;
  const editable = campaign.status !== 'completed' && !budgetExhausted;

  async function save() {
    await update.mutateAsync({
      id: campaign.id,
      dailyBudgetCents: Math.round((parseFloat(dailyBudget) || 0) * 100),
      totalBudgetCents: Math.round((parseFloat(totalBudget) || 0) * 100),
      endDate: endDate || null,
    });
    setEditing(false);
  }

  return (
    <Card>
      <CardHeader
        title="Budget"
        action={
          editable ? (
            editing ? (
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={save} disabled={update.isPending}>
                  {update.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                Edit
              </Button>
            )
          ) : undefined
        }
      />
      <div className="space-y-3 px-5 pb-5 pt-3">
        {update.isError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400">
            {getApiErrorMessage(update.error, 'Could not update this campaign.')}
          </p>
        )}
        {!editing && (
          <>
            <div>
              <div className="flex items-center justify-between text-sm text-ink-600 dark:text-ink-300">
                <span>{cents(campaign.spentCents)} spent of {cents(campaign.totalBudgetCents)}</span>
                <span className="font-semibold">{pct}%</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                <div className={cn('h-full rounded-full', budgetExhausted ? 'bg-amber-500' : 'bg-brand-500')} style={{ width: `${pct}%` }} />
              </div>
            </div>
            <p className="text-xs text-ink-500 dark:text-ink-400">Daily budget: {cents(campaign.dailyBudgetCents)} · Spent today: {cents(campaign.spentTodayCents)}</p>
            {budgetExhausted && (
              <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" /> Total budget exhausted — increase it to keep spending.
              </p>
            )}
          </>
        )}
        {editing && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <p className="mb-1 text-xs font-semibold text-ink-600 dark:text-ink-300">Daily budget (USD)</p>
              <Input type="number" min={1} step="0.01" value={dailyBudget} onChange={(e) => setDailyBudget(e.target.value)} />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-ink-600 dark:text-ink-300">Total budget (USD)</p>
              <Input type="number" min={1} step="0.01" value={totalBudget} onChange={(e) => setTotalBudget(e.target.value)} />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-ink-600 dark:text-ink-300">End date</p>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function TargetingSection({ campaign }: { campaign: NonNullable<ReturnType<typeof useAdCampaign>['data']> }) {
  const update = useUpdateAdCampaign();
  const [editing, setEditing] = useState(false);
  const [locations, setLocations] = useState((campaign.targeting.locations ?? []).join(', '));
  const [industries, setIndustries] = useState((campaign.targeting.industries ?? []).join(', '));
  const [skills, setSkills] = useState((campaign.targeting.skills ?? []).join(', '));
  const [openToWorkOnly, setOpenToWorkOnly] = useState(Boolean(campaign.targeting.openToWorkOnly));

  function toArray(v: string) {
    return v.split(',').map((s) => s.trim()).filter(Boolean);
  }

  async function save() {
    const targeting: AdTargeting = {
      locations: toArray(locations),
      industries: toArray(industries),
      skills: toArray(skills),
      openToWorkOnly: campaign.objective === 'job_promotion' ? openToWorkOnly : undefined,
    };
    await update.mutateAsync({ id: campaign.id, targeting });
    setEditing(false);
  }

  const editable = campaign.status !== 'completed';

  return (
    <Card>
      <CardHeader
        title="Targeting"
        action={
          editable ? (
            editing ? (
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={save} disabled={update.isPending}>
                  {update.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                Edit
              </Button>
            )
          ) : undefined
        }
      />
      <div className="space-y-2.5 px-5 pb-5 pt-3 text-sm">
        {!editing && (
          <>
            <TargetingRow label="Locations" value={campaign.targeting.locations} />
            <TargetingRow label="Industries" value={campaign.targeting.industries} />
            <TargetingRow label="Skills" value={campaign.targeting.skills} />
            {campaign.objective === 'job_promotion' && (
              <p className="text-ink-600 dark:text-ink-300">
                <span className="font-semibold text-ink-700 dark:text-ink-200">Open to work only:</span> {campaign.targeting.openToWorkOnly ? 'Yes' : 'No'}
              </p>
            )}
          </>
        )}
        {editing && (
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-xs font-semibold text-ink-600 dark:text-ink-300">Locations (comma-separated)</p>
              <Input value={locations} onChange={(e) => setLocations(e.target.value)} placeholder="e.g. London, Remote" />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-ink-600 dark:text-ink-300">Industries (comma-separated)</p>
              <Input value={industries} onChange={(e) => setIndustries(e.target.value)} placeholder="e.g. Technology, Finance" />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-ink-600 dark:text-ink-300">Skills (comma-separated)</p>
              <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="e.g. React, Sales" />
            </div>
            {campaign.objective === 'job_promotion' && (
              <label className="flex items-center gap-2.5 text-sm font-semibold text-ink-700 dark:text-ink-200">
                <input type="checkbox" checked={openToWorkOnly} onChange={(e) => setOpenToWorkOnly(e.target.checked)} className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500" />
                Only show to people open to work
              </label>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function TargetingRow({ label, value }: { label: string; value?: string[] }) {
  return (
    <p className="text-ink-600 dark:text-ink-300">
      <span className="font-semibold text-ink-700 dark:text-ink-200">{label}:</span> {value && value.length > 0 ? value.join(', ') : 'No restriction'}
    </p>
  );
}
