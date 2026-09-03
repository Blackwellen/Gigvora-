'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Gauge,
  Loader2,
  Megaphone,
  Rocket,
  ShieldAlert,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useJob } from '@/hooks/jobs/useJob';
import {
  useCreateSponsoredJobCampaign,
  type CreateSponsoredJobCampaignInput,
  type SponsoredJobBidType,
  type SponsoredJobGoal,
} from '@/hooks/jobs/useCreateSponsoredJobCampaign';
import { getApiErrorMessage } from '@/lib/api';

const STEPS = [
  'Select job',
  'Campaign goal',
  'Targeting',
  'Bid',
  'Daily budget',
  'Total budget',
  'Schedule',
  'Ad creative',
  'Reach estimate',
  'Review & launch',
] as const;

const GOALS: { value: SponsoredJobGoal; label: string; description: string; icon: typeof Eye }[] = [
  { value: 'visibility', label: 'Maximize visibility', description: 'Get this job in front of as many relevant candidates as possible.', icon: Eye },
  { value: 'applicant_volume', label: 'Applicant volume', description: 'Optimize spend toward the highest number of qualified applications.', icon: Target },
  { value: 'premium_placement', label: 'Premium placement', description: 'Guaranteed top-of-search and homepage placement for the campaign duration.', icon: Sparkles },
];

const BID_TYPES: { value: SponsoredJobBidType; label: string; description: string }[] = [
  { value: 'cpc', label: 'Cost per click (CPC)', description: 'Pay only when a candidate clicks into the job.' },
  { value: 'cpa', label: 'Cost per application (CPA)', description: 'Pay only when a candidate submits an application.' },
  { value: 'flat', label: 'Flat placement fee', description: 'Fixed daily rate for guaranteed premium placement.' },
];

const HIGHLIGHT_OPTIONS = [
  { key: 'salary', label: 'Salary range' },
  { key: 'location', label: 'Location & work mode' },
  { key: 'skills', label: 'Top required skills' },
  { key: 'benefits', label: 'Benefits' },
  { key: 'company', label: 'Company name & logo' },
];

const CATEGORY_OPTIONS = ['Engineering', 'Design', 'Product', 'Sales', 'Marketing', 'Operations', 'Finance', 'Customer Success'];
const AUDIENCE_OPTIONS = ['Active job seekers', 'Passive candidates', 'Recent graduates', 'Career changers', 'Alumni network'];

type FormState = {
  goal: SponsoredJobGoal | null;
  locations: string[];
  categories: string[];
  audience: string[];
  bidType: SponsoredJobBidType | null;
  bidAmount: string;
  budgetDaily: string;
  budgetTotal: string;
  startsAt: string;
  endsAt: string;
  headline: string;
  highlightFields: string[];
};

const INITIAL: FormState = {
  goal: null,
  locations: [],
  categories: [],
  audience: [],
  bidType: null,
  bidAmount: '',
  budgetDaily: '',
  budgetTotal: '',
  startsAt: '',
  endsAt: '',
  headline: '',
  highlightFields: [],
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatCurrency(n: number): string {
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function formatCompact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(Math.round(n));
}

/** Non-guaranteed reach projection from budget/bid inputs — rule-based, same disclaimer tone as the
 * AI delivery-risk card on project-analytics. Assumes a 3% click-through rate and an 8% click-to-apply
 * rate as baseline marketplace averages; flat placement is modeled as a fixed daily impression grant. */
function estimateReach(input: { bidType: SponsoredJobBidType; bidAmount: number; budgetTotal: number }) {
  const CTR = 0.03;
  const APPLY_RATE = 0.08;
  let clicks = 0;
  let impressions = 0;
  let applies = 0;

  if (input.bidType === 'cpc' && input.bidAmount > 0) {
    clicks = input.budgetTotal / input.bidAmount;
    impressions = clicks / CTR;
    applies = clicks * APPLY_RATE;
  } else if (input.bidType === 'cpa' && input.bidAmount > 0) {
    applies = input.budgetTotal / input.bidAmount;
    clicks = applies / APPLY_RATE;
    impressions = clicks / CTR;
  } else {
    impressions = input.budgetTotal * 50;
    clicks = impressions * CTR;
    applies = clicks * APPLY_RATE;
  }

  return {
    impressions: { low: Math.round(impressions * 0.8), high: Math.round(impressions * 1.2) },
    clicks: { low: Math.round(clicks * 0.8), high: Math.round(clicks * 1.2) },
    applies: { low: Math.round(applies * 0.8), high: Math.round(applies * 1.2) },
  };
}

function TagInput({
  values,
  onChange,
  placeholder,
  suggestions,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState('');

  function addValue(raw: string) {
    const v = raw.trim();
    if (!v || values.includes(v)) return;
    onChange([...values, v]);
    setDraft('');
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {values.map((v) => (
          <span
            key={v}
            className="flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-400"
          >
            {v}
            <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} aria-label={`Remove ${v}`}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              addValue(draft);
            }
          }}
          placeholder={placeholder}
        />
        <Button type="button" variant="outline" size="md" onClick={() => addValue(draft)} disabled={!draft.trim()}>
          Add
        </Button>
      </div>
      {suggestions && suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {suggestions
            .filter((s) => !values.includes(s))
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => addValue(s)}
                className="rounded-full border border-ink-200 px-2.5 py-1 text-xs font-medium text-ink-500 hover:border-brand-300 hover:text-brand-600 dark:border-ink-700 dark:text-ink-400"
              >
                + {s}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-ink-100 py-2 last:border-0 dark:border-ink-800">
      <span className="text-ink-500 dark:text-ink-400">{label}</span>
      <span className="text-right font-semibold text-ink-900 dark:text-white">{value}</span>
    </div>
  );
}

function SponsoredJobSetupInner() {
  const router = useRouter();
  const jobId = useSearchParams().get('jobId') || undefined;
  const { data: job, isLoading: jobLoading, isError: jobError, error: jobErrorObj } = useJob(jobId);
  const createCampaign = useCreateSponsoredJobCampaign();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [launchedCampaignId, setLaunchedCampaignId] = useState<string | null>(null);
  const [launchedAsDraft, setLaunchedAsDraft] = useState(false);

  const bidAmountNum = Number(form.bidAmount) || 0;
  const budgetDailyNum = Number(form.budgetDaily) || 0;
  const budgetTotalNum = Number(form.budgetTotal) || 0;

  const estimate = useMemo(() => {
    if (!form.bidType || bidAmountNum <= 0 || budgetTotalNum <= 0) return null;
    return estimateReach({ bidType: form.bidType, bidAmount: bidAmountNum, budgetTotal: budgetTotalNum });
  }, [form.bidType, bidAmountNum, budgetTotalNum]);

  const canAdvance = useMemo(() => {
    switch (step) {
      case 0:
        return Boolean(job);
      case 1:
        return Boolean(form.goal);
      case 2:
        return form.locations.length > 0 || form.categories.length > 0;
      case 3:
        return Boolean(form.bidType) && bidAmountNum > 0;
      case 4:
        return budgetDailyNum > 0;
      case 5:
        return budgetTotalNum > 0 && budgetTotalNum >= budgetDailyNum;
      case 6:
        return Boolean(form.startsAt) && (!form.endsAt || form.endsAt >= form.startsAt);
      case 7:
        return form.headline.trim().length > 0 && form.highlightFields.length > 0;
      case 8:
        return true;
      default:
        return true;
    }
  }, [step, job, form, bidAmountNum, budgetDailyNum, budgetTotalNum]);

  function toggleHighlight(key: string) {
    setForm((f) => ({
      ...f,
      highlightFields: f.highlightFields.includes(key) ? f.highlightFields.filter((k) => k !== key) : [...f.highlightFields, key],
    }));
  }

  async function submitCampaign(status: 'active' | 'draft') {
    if (!jobId || !form.goal || !form.bidType) return;
    const input: CreateSponsoredJobCampaignInput = {
      job_id: jobId,
      budget_total: budgetTotalNum,
      budget_daily: budgetDailyNum,
      bid_type: form.bidType,
      bid_amount: bidAmountNum,
      starts_at: form.startsAt,
      ends_at: form.endsAt || null,
      targeting: {
        goal: form.goal,
        locations: form.locations,
        categories: form.categories,
        audience: form.audience,
        headline: form.headline,
        highlight_fields: form.highlightFields,
      },
      status,
    };
    const campaign = await createCampaign.mutateAsync(input);
    setLaunchedCampaignId(campaign.id);
    setLaunchedAsDraft(status === 'draft');
  }

  if (!jobId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6 lg:px-0">
        <div className="rounded-2xl border border-dashed border-ink-200 bg-white py-16 text-center dark:border-ink-700 dark:bg-ink-900">
          <Megaphone className="mx-auto h-6 w-6 text-ink-300" />
          <p className="mt-2 text-sm font-semibold text-ink-700 dark:text-ink-200">No job selected</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">
            Open Sponsored Job Setup from a job's detail page so we know which posting to promote.
          </p>
        </div>
      </div>
    );
  }

  if (jobLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (jobError) {
    const status = axios.isAxiosError(jobErrorObj) ? jobErrorObj.response?.status : undefined;
    const isForbidden = status === 403;
    const isNotFound = status === 404;
    return (
      <div className="mx-auto max-w-2xl px-4 py-6 lg:px-0">
        <div className="rounded-2xl border border-dashed border-ink-200 bg-white py-16 text-center dark:border-ink-700 dark:bg-ink-900">
          <ShieldAlert className="mx-auto h-6 w-6 text-amber-500" />
          <p className="mt-2 text-sm font-semibold text-ink-700 dark:text-ink-200">
            {isForbidden ? "You don't have access to this job" : isNotFound ? 'Job not found' : "Couldn't load this job"}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">
            {getApiErrorMessage(jobErrorObj, "This job doesn't exist or you don't have access to it.")}
          </p>
        </div>
      </div>
    );
  }

  if (launchedCampaignId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6 lg:px-0">
        <Card className="space-y-4 p-8 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15">
            {launchedAsDraft ? <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" /> : <Rocket className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />}
          </span>
          <h2 className="text-xl font-bold text-ink-900 dark:text-white">
            {launchedAsDraft ? 'Campaign saved as draft' : 'Campaign launched'}
          </h2>
          <p className="text-sm text-ink-500 dark:text-ink-400">
            {launchedAsDraft
              ? `Your sponsorship campaign for "${job?.title}" was saved. Launch it any time from the job's detail page.`
              : `Your sponsorship campaign for "${job?.title}" is now live and will appear in search results and recommendations.`}
          </p>
          <div className="flex flex-col items-center gap-2 pt-2 sm:flex-row sm:justify-center">
            <Button onClick={() => router.push(`/app/job-detail?jobId=${jobId}`)}>Go to job detail</Button>
            <Button variant="outline" onClick={() => router.push('/app/jobs-home')}>
              Back to Jobs Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6 lg:px-0">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
          <Megaphone className="h-5 w-5 text-brand-600" /> Sponsor this job
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Set up a paid campaign to boost visibility and applications for this posting.
        </p>
      </div>

      <ol className="flex items-center gap-1">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-1">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-400 dark:bg-ink-800'
              }`}
              title={label}
            >
              {i < step ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-ink-100 dark:bg-ink-800" />}
          </li>
        ))}
      </ol>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">
        Step {step + 1} of {STEPS.length} · {STEPS[step]}
      </p>

      <Card className="p-5">
        {step === 0 && job && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">You're setting up a sponsorship campaign for:</p>
            <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-4 dark:border-ink-800 dark:bg-ink-800/40">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-bold text-ink-900 dark:text-white">{job.title}</p>
                  <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">
                    {job.company_name || 'Your company'} · {job.location || 'Location not set'}
                  </p>
                </div>
                <Badge tone={job.status === 'open' ? 'success' : 'neutral'} className="capitalize">
                  {job.status.replace('_', ' ')}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(job.skills || []).slice(0, 6).map((skill) => (
                  <Badge key={skill} tone="brand">
                    {skill}
                  </Badge>
                ))}
              </div>
              {typeof job.applicant_count === 'number' && (
                <p className="mt-3 text-xs text-ink-400 dark:text-ink-500">{job.applicant_count} applicant(s) so far</p>
              )}
            </div>
            {job.status !== 'open' && (
              <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-3.5 w-3.5" /> This job isn't published yet — publish it before your campaign starts driving traffic.
              </p>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">What's the main goal of this campaign?</label>
            {GOALS.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => setForm({ ...form, goal: g.value })}
                className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                  form.goal === g.value
                    ? 'border-brand-500 bg-brand-50 dark:border-brand-500/60 dark:bg-brand-500/10'
                    : 'border-ink-200 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800'
                }`}
              >
                <g.icon className={`mt-0.5 h-5 w-5 shrink-0 ${form.goal === g.value ? 'text-brand-600' : 'text-ink-400'}`} />
                <div>
                  <p className={`text-sm font-bold ${form.goal === g.value ? 'text-brand-700 dark:text-brand-400' : 'text-ink-900 dark:text-white'}`}>{g.label}</p>
                  <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{g.description}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Target locations</label>
              <TagInput
                values={form.locations}
                onChange={(locations) => setForm({ ...form, locations })}
                placeholder="e.g. New York, Remote"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Target categories</label>
              <TagInput
                values={form.categories}
                onChange={(categories) => setForm({ ...form, categories })}
                placeholder="Add a category"
                suggestions={CATEGORY_OPTIONS}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Audience</label>
              <TagInput
                values={form.audience}
                onChange={(audience) => setForm({ ...form, audience })}
                placeholder="Add an audience segment"
                suggestions={AUDIENCE_OPTIONS}
              />
            </div>
            <p className="text-xs text-ink-400 dark:text-ink-500">Add at least one location or category to continue.</p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Bid type</label>
            {BID_TYPES.map((bt) => (
              <button
                key={bt.value}
                type="button"
                onClick={() => setForm({ ...form, bidType: bt.value })}
                className={`flex w-full items-start justify-between gap-3 rounded-xl border p-4 text-left transition-colors ${
                  form.bidType === bt.value
                    ? 'border-brand-500 bg-brand-50 dark:border-brand-500/60 dark:bg-brand-500/10'
                    : 'border-ink-200 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800'
                }`}
              >
                <div>
                  <p className={`text-sm font-bold ${form.bidType === bt.value ? 'text-brand-700 dark:text-brand-400' : 'text-ink-900 dark:text-white'}`}>{bt.label}</p>
                  <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{bt.description}</p>
                </div>
              </button>
            ))}
            {form.bidType && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">
                  Bid amount ({form.bidType === 'flat' ? 'per day' : `per ${form.bidType === 'cpc' ? 'click' : 'application'}`})
                </label>
                <div className="relative max-w-[180px]">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-400">$</span>
                  <Input type="number" min="0" step="0.01" value={form.bidAmount} onChange={(e) => setForm({ ...form, bidAmount: e.target.value })} className="pl-6" placeholder="0.00" />
                </div>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-2">
            <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Daily budget cap</label>
            <div className="relative max-w-[220px]">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-400">$</span>
              <Input type="number" min="0" step="1" value={form.budgetDaily} onChange={(e) => setForm({ ...form, budgetDaily: e.target.value })} className="pl-6" placeholder="e.g. 50" />
            </div>
            <p className="text-xs text-ink-400 dark:text-ink-500">Spend will never exceed this amount on any single day, even under high demand.</p>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-2">
            <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Total campaign budget</label>
            <div className="relative max-w-[220px]">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-400">$</span>
              <Input type="number" min="0" step="1" value={form.budgetTotal} onChange={(e) => setForm({ ...form, budgetTotal: e.target.value })} className="pl-6" placeholder="e.g. 750" />
            </div>
            {budgetDailyNum > 0 && budgetTotalNum > 0 && budgetTotalNum < budgetDailyNum && (
              <p className="text-xs text-red-600 dark:text-red-400">Total budget must be at least your daily cap ({formatCurrency(budgetDailyNum)}).</p>
            )}
            {budgetDailyNum > 0 && budgetTotalNum >= budgetDailyNum && (
              <p className="text-xs text-ink-400 dark:text-ink-500">
                At your daily cap, this budget covers roughly {Math.floor(budgetTotalNum / budgetDailyNum)} day(s) of spend.
              </p>
            )}
          </div>
        )}

        {step === 6 && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Start date</label>
              <Input type="date" min={todayIso()} value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">End date (optional)</label>
              <Input type="date" min={form.startsAt || todayIso()} value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
            </div>
            <p className="col-span-2 text-xs text-ink-400 dark:text-ink-500">Leave the end date blank to run until the total budget is spent.</p>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Promotional headline</label>
              <textarea
                value={form.headline}
                onChange={(e) => setForm({ ...form, headline: e.target.value.slice(0, 140) })}
                rows={3}
                placeholder="e.g. Join a fast-growing team building the future of remote work — competitive pay, fully remote."
                className="w-full rounded-control border border-ink-200 bg-white p-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
              />
              <p className="mt-1 text-right text-xs text-ink-400 dark:text-ink-500">{form.headline.length} / 140</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Job details to feature in the ad</label>
              <div className="grid grid-cols-2 gap-2">
                {HIGHLIGHT_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => toggleHighlight(opt.key)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors ${
                      form.highlightFields.includes(opt.key)
                        ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500/60 dark:bg-brand-500/10 dark:text-brand-400'
                        : 'border-ink-200 text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300'
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${
                        form.highlightFields.includes(opt.key) ? 'bg-brand-600 text-white' : 'border border-ink-300 dark:border-ink-600'
                      }`}
                    >
                      {form.highlightFields.includes(opt.key) && <Check className="h-3 w-3" />}
                    </span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 8 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-purple-600" />
              <h3 className="text-sm font-bold text-ink-900 dark:text-white">Estimated reach</h3>
              <Badge tone="brand">Projection</Badge>
            </div>
            {estimate ? (
              <>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-3 dark:border-ink-800 dark:bg-ink-800/40">
                    <p className="text-lg font-bold text-ink-900 dark:text-white">
                      {formatCompact(estimate.impressions.low)}–{formatCompact(estimate.impressions.high)}
                    </p>
                    <p className="text-xs text-ink-400 dark:text-ink-500">Impressions</p>
                  </div>
                  <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-3 dark:border-ink-800 dark:bg-ink-800/40">
                    <p className="text-lg font-bold text-ink-900 dark:text-white">
                      {formatCompact(estimate.clicks.low)}–{formatCompact(estimate.clicks.high)}
                    </p>
                    <p className="text-xs text-ink-400 dark:text-ink-500">Clicks</p>
                  </div>
                  <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-3 dark:border-ink-800 dark:bg-ink-800/40">
                    <p className="text-lg font-bold text-ink-900 dark:text-white">
                      {formatCompact(estimate.applies.low)}–{formatCompact(estimate.applies.high)}
                    </p>
                    <p className="text-xs text-ink-400 dark:text-ink-500">Applications</p>
                  </div>
                </div>
                <p className="text-[11px] text-ink-400 dark:text-ink-500">
                  Rule-based projection from your budget and bid — based on marketplace average click-through and apply
                  rates. Not a guaranteed outcome; actual delivery varies with candidate demand and job relevance.
                </p>
              </>
            ) : (
              <p className="text-sm text-ink-400 dark:text-ink-500">Set your bid and budget in earlier steps to see an estimate.</p>
            )}
          </div>
        )}

        {step === 9 && (
          <div className="space-y-2 text-sm">
            <ReviewRow label="Job" value={job?.title || '—'} />
            <ReviewRow label="Goal" value={GOALS.find((g) => g.value === form.goal)?.label || '—'} />
            <ReviewRow label="Locations" value={form.locations.join(', ') || '—'} />
            <ReviewRow label="Categories" value={form.categories.join(', ') || '—'} />
            <ReviewRow label="Audience" value={form.audience.join(', ') || 'Everyone'} />
            <ReviewRow label="Bid type" value={BID_TYPES.find((b) => b.value === form.bidType)?.label || '—'} />
            <ReviewRow label="Bid amount" value={formatCurrency(bidAmountNum)} />
            <ReviewRow label="Daily budget" value={formatCurrency(budgetDailyNum)} />
            <ReviewRow label="Total budget" value={formatCurrency(budgetTotalNum)} />
            <ReviewRow label="Schedule" value={`${form.startsAt || '—'} → ${form.endsAt || 'Until budget spent'}`} />
            <ReviewRow label="Headline" value={form.headline || '—'} />
            <ReviewRow label="Featured details" value={form.highlightFields.map((k) => HIGHLIGHT_OPTIONS.find((o) => o.key === k)?.label).join(', ') || '—'} />
            {createCampaign.isError && <p className="pt-2 text-sm text-red-600 dark:text-red-400">{getApiErrorMessage(createCampaign.error)}</p>}
          </div>
        )}
      </Card>

      <div className="flex justify-between gap-2">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} disabled={!canAdvance}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => submitCampaign('draft')} loading={createCampaign.isPending && createCampaign.variables?.status === 'draft'} disabled={createCampaign.isPending}>
              Save as draft
            </Button>
            <Button onClick={() => submitCampaign('active')} loading={createCampaign.isPending && createCampaign.variables?.status === 'active'} disabled={createCampaign.isPending}>
              <Rocket className="h-4 w-4" /> Launch campaign
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SponsoredJobSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-ink-300" />
        </div>
      }
    >
      <SponsoredJobSetupInner />
    </Suspense>
  );
}
