'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { AlertTriangle, Briefcase, Building2, Check, FileText, Loader2, Plus, Rocket, Save, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/cn';
import { getApiErrorMessage } from '@/lib/api';
import { useFeed, type FeedPostData } from '@/hooks/useFeed';
import { useMyPostedJobsForAds, useMyOwnedCompaniesForAds } from '@/hooks/useAdContentSources';
import { useCreateAdCampaign, useSubmitCampaignForReview, type AdObjective, type AdTargeting } from '@/hooks/useAds';
import { OBJECTIVE_LABEL } from '../../adsShared';

const STEPS = ['Objective', 'Content', 'Targeting', 'Budget & schedule', 'Review & launch'] as const;
type Step = (typeof STEPS)[number];

type DraftState = {
  objective: AdObjective | null;
  contentId: string | null;
  contentLabel: string;
  headline: string;
  destinationUrl: string;
  locations: string[];
  industries: string[];
  skills: string[];
  openToWorkOnly: boolean;
  dailyBudget: string; // dollars, as typed
  totalBudget: string; // dollars, as typed
  startDate: string;
  endDate: string;
};

function defaultDraft(): DraftState {
  return {
    objective: null,
    contentId: null,
    contentLabel: '',
    headline: '',
    destinationUrl: '',
    locations: [],
    industries: [],
    skills: [],
    openToWorkOnly: false,
    dailyBudget: '10',
    totalBudget: '100',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: '',
  };
}

const OBJECTIVE_CARDS: Array<{ key: AdObjective; icon: typeof FileText; description: string }> = [
  { key: 'post_engagement', icon: FileText, description: 'Get more likes, comments and shares on one of your existing posts.' },
  { key: 'job_promotion', icon: Briefcase, description: 'Get more qualified applicants for a job you already posted.' },
  { key: 'company_awareness', icon: Building2, description: 'Grow visibility for your company page among the right audience.' },
];

export default function CreateAdCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('Objective');
  const [draft, setDraft] = useState<DraftState>(defaultDraft());
  const [submitError, setSubmitError] = useState<string | null>(null);

  const createCampaign = useCreateAdCampaign();
  const submitForReview = useSubmitCampaignForReview();

  function update<K extends keyof DraftState>(key: K, value: DraftState[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  const dailyBudgetCents = Math.round((parseFloat(draft.dailyBudget) || 0) * 100);
  const totalBudgetCents = Math.round((parseFloat(draft.totalBudget) || 0) * 100);
  const budgetValid = dailyBudgetCents >= 100 && totalBudgetCents >= dailyBudgetCents;

  const stepIndex = STEPS.indexOf(step);
  const canContinue = useMemo(() => {
    if (step === 'Objective') return Boolean(draft.objective);
    if (step === 'Content') return Boolean(draft.contentId);
    if (step === 'Budget & schedule') return budgetValid && Boolean(draft.startDate);
    return true;
  }, [step, draft.objective, draft.contentId, budgetValid, draft.startDate]);

  const targeting: AdTargeting = {
    locations: draft.locations.length ? draft.locations : undefined,
    industries: draft.industries.length ? draft.industries : undefined,
    skills: draft.skills.length ? draft.skills : undefined,
    openToWorkOnly: draft.objective === 'job_promotion' ? draft.openToWorkOnly : undefined,
  };

  async function submit(launch: boolean) {
    if (!draft.objective || !draft.contentId) return;
    setSubmitError(null);
    try {
      const campaign = await createCampaign.mutateAsync({
        name: draft.headline.trim() || draft.contentLabel || `${OBJECTIVE_LABEL[draft.objective]} campaign`,
        objective: draft.objective,
        dailyBudgetCents,
        totalBudgetCents,
        startDate: draft.startDate,
        endDate: draft.endDate || undefined,
        targeting,
        contentId: draft.contentId,
        headline: draft.headline.trim() || undefined,
        destinationUrl: draft.destinationUrl.trim() || undefined,
      });
      if (launch) {
        await submitForReview.mutateAsync(campaign.id);
      }
      router.push(`/app/gigvora-ads/campaigns/${campaign.id}`);
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, 'Could not create this campaign. Please check your details and try again.'));
    }
  }

  const isSubmitting = createCampaign.isPending || submitForReview.isPending;

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 lg:px-8">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold tracking-[-0.01em] text-ink-900 dark:text-white">Create campaign</h1>
        <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">
          Promote a post, a job you posted, or your company page — real budget, real targeting, real spend.
        </p>
      </div>

      {/* Stepper */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {STEPS.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => i <= stepIndex && setStep(s)}
            disabled={i > stepIndex}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition',
              step === s
                ? 'bg-brand-600 text-white'
                : i < stepIndex
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                : 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400'
            )}
          >
            {i < stepIndex && <Check className="h-3 w-3" />} {i + 1}. {s}
          </button>
        ))}
      </div>

      <Card className="p-5">
        {step === 'Objective' && (
          <div>
            <p className="mb-3 text-sm font-semibold text-ink-700 dark:text-ink-200">What do you want to promote?</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {OBJECTIVE_CARDS.map(({ key, icon: Icon, description }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    update('objective', key);
                    update('contentId', null);
                    update('contentLabel', '');
                  }}
                  className={cn(
                    'flex flex-col items-start gap-2.5 rounded-xl border p-4 text-left transition',
                    draft.objective === key
                      ? 'border-brand-400 bg-brand-50 dark:border-brand-500 dark:bg-brand-500/10'
                      : 'border-ink-200 hover:border-ink-300 dark:border-ink-700 dark:hover:border-ink-600'
                  )}
                >
                  <span className={cn('flex h-10 w-10 items-center justify-center rounded-lg', draft.objective === key ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400')}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="font-display text-sm font-bold text-ink-900 dark:text-white">{OBJECTIVE_LABEL[key]}</span>
                  <span className="text-xs text-ink-500 dark:text-ink-400">{description}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'Content' && draft.objective && (
          <ContentStep
            objective={draft.objective}
            contentId={draft.contentId}
            onSelect={(id, label) => {
              update('contentId', id);
              update('contentLabel', label);
            }}
            headline={draft.headline}
            destinationUrl={draft.destinationUrl}
            onHeadline={(v) => update('headline', v)}
            onDestinationUrl={(v) => update('destinationUrl', v)}
          />
        )}

        {step === 'Targeting' && (
          <TargetingStep
            objective={draft.objective}
            locations={draft.locations}
            industries={draft.industries}
            skills={draft.skills}
            openToWorkOnly={draft.openToWorkOnly}
            onLocations={(v) => update('locations', v)}
            onIndustries={(v) => update('industries', v)}
            onSkills={(v) => update('skills', v)}
            onOpenToWorkOnly={(v) => update('openToWorkOnly', v)}
          />
        )}

        {step === 'Budget & schedule' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Daily budget (USD)">
                <Input type="number" min={1} step="0.01" value={draft.dailyBudget} onChange={(e) => update('dailyBudget', e.target.value)} />
              </Field>
              <Field label="Total budget (USD)">
                <Input type="number" min={1} step="0.01" value={draft.totalBudget} onChange={(e) => update('totalBudget', e.target.value)} />
              </Field>
            </div>
            {!budgetValid && (
              <p className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" /> Daily budget must be at least $1.00, and total budget must be at least the daily budget.
              </p>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Start date">
                <Input type="date" value={draft.startDate} onChange={(e) => update('startDate', e.target.value)} />
              </Field>
              <Field label="End date (optional)">
                <Input type="date" value={draft.endDate} min={draft.startDate} onChange={(e) => update('endDate', e.target.value)} />
              </Field>
            </div>
            <div className="rounded-lg bg-ink-50 px-3.5 py-2.5 text-xs text-ink-500 dark:bg-ink-800/60 dark:text-ink-400">
              Platform rates: impressions $0.02 each · clicks $0.50 each. You never pay more than your daily or total budget allows.
            </div>
          </div>
        )}

        {step === 'Review & launch' && draft.objective && (
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-bold text-ink-900 dark:text-white">{draft.headline || draft.contentLabel || 'Untitled campaign'}</p>
              <p className="text-ink-500 dark:text-ink-400">{OBJECTIVE_LABEL[draft.objective]}</p>
            </div>
            <ReviewRow label="Promoting">{draft.contentLabel || '—'}</ReviewRow>
            {draft.destinationUrl && <ReviewRow label="Destination URL">{draft.destinationUrl}</ReviewRow>}
            <ReviewRow label="Locations">{draft.locations.length ? draft.locations.join(', ') : 'No restriction'}</ReviewRow>
            <ReviewRow label="Industries">{draft.industries.length ? draft.industries.join(', ') : 'No restriction'}</ReviewRow>
            <ReviewRow label="Skills">{draft.skills.length ? draft.skills.join(', ') : 'No restriction'}</ReviewRow>
            {draft.objective === 'job_promotion' && <ReviewRow label="Open to work only">{draft.openToWorkOnly ? 'Yes' : 'No'}</ReviewRow>}
            <ReviewRow label="Daily budget">${draft.dailyBudget || '0'}</ReviewRow>
            <ReviewRow label="Total budget">${draft.totalBudget || '0'}</ReviewRow>
            <ReviewRow label="Schedule">
              {draft.startDate} {draft.endDate ? `→ ${draft.endDate}` : '(no end date)'}
            </ReviewRow>

            <p className="text-xs text-ink-400 dark:text-ink-500">
              "Launch now" runs an instant, automated approval check (v1 — there is no multi-day manual review queue) and immediately activates the campaign. "Save as draft" leaves it editable and inactive until you launch it.
            </p>

            {submitError && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">{submitError}</p>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button variant="outline" onClick={() => submit(false)} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save as draft
              </Button>
              <Button onClick={() => submit(true)} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />} Launch now
              </Button>
            </div>
          </div>
        )}

        {/* Action bar */}
        <div className="mt-6 flex items-center justify-between border-t border-ink-100 pt-4 dark:border-ink-800">
          <Link href="/app/gigvora-ads/campaigns" className="text-sm font-semibold text-ink-500 hover:text-ink-700 dark:text-ink-400">
            Cancel
          </Link>
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <Button variant="outline" onClick={() => setStep(STEPS[stepIndex - 1])}>
                Back
              </Button>
            )}
            {stepIndex < STEPS.length - 1 && (
              <Button onClick={() => setStep(STEPS[stepIndex + 1])} disabled={!canContinue}>
                Continue
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-ink-600 dark:text-ink-300">{label}</p>
      {children}
    </div>
  );
}

function ReviewRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p>
      <span className="font-semibold text-ink-700 dark:text-ink-200">{label}:</span> <span className="text-ink-600 dark:text-ink-300">{children}</span>
    </p>
  );
}

function TagInputField({ label, values, onChange, placeholder }: { label: string; values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [text, setText] = useState('');
  function add(e: React.FormEvent) {
    e.preventDefault();
    const tag = text.trim();
    if (!tag || values.includes(tag)) {
      setText('');
      return;
    }
    onChange([...values, tag]);
    setText('');
  }
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-ink-600 dark:text-ink-300">{label}</p>
      <form onSubmit={add} className="mb-2 flex gap-1.5">
        <Input placeholder={placeholder} value={text} onChange={(e) => setText(e.target.value)} className="h-9 flex-1 text-sm" />
        <Button type="submit" size="sm" variant="outline" disabled={!text.trim()}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </form>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span key={v} className="flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
              {v}
              <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} aria-label={`Remove ${v}`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      {values.length === 0 && <p className="text-xs text-ink-400 dark:text-ink-500">Empty means no restriction on this dimension.</p>}
    </div>
  );
}

function TargetingStep({
  objective,
  locations,
  industries,
  skills,
  openToWorkOnly,
  onLocations,
  onIndustries,
  onSkills,
  onOpenToWorkOnly,
}: {
  objective: AdObjective | null;
  locations: string[];
  industries: string[];
  skills: string[];
  openToWorkOnly: boolean;
  onLocations: (v: string[]) => void;
  onIndustries: (v: string[]) => void;
  onSkills: (v: string[]) => void;
  onOpenToWorkOnly: (v: boolean) => void;
}) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-ink-500 dark:text-ink-400">All targeting is optional. Leave a field empty to reach everyone on that dimension.</p>
      <TagInputField label="Locations" values={locations} onChange={onLocations} placeholder="e.g. London, Remote" />
      <TagInputField label="Industries" values={industries} onChange={onIndustries} placeholder="e.g. Technology, Finance" />
      <TagInputField label="Skills" values={skills} onChange={onSkills} placeholder="e.g. React, Sales" />
      {objective === 'job_promotion' && (
        <label className="flex items-center gap-2.5 text-sm font-semibold text-ink-700 dark:text-ink-200">
          <input type="checkbox" checked={openToWorkOnly} onChange={(e) => onOpenToWorkOnly(e.target.checked)} className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500" />
          Only show this ad to people marked "open to work"
        </label>
      )}
    </div>
  );
}

function ContentStep({
  objective,
  contentId,
  onSelect,
  headline,
  destinationUrl,
  onHeadline,
  onDestinationUrl,
}: {
  objective: AdObjective;
  contentId: string | null;
  onSelect: (id: string, label: string) => void;
  headline: string;
  destinationUrl: string;
  onHeadline: (v: string) => void;
  onDestinationUrl: (v: string) => void;
}) {
  return (
    <div className="space-y-5">
      {objective === 'post_engagement' && <PostPicker contentId={contentId} onSelect={onSelect} />}
      {objective === 'job_promotion' && <JobPicker contentId={contentId} onSelect={onSelect} />}
      {objective === 'company_awareness' && <CompanyPicker contentId={contentId} onSelect={onSelect} />}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Headline override (optional)">
          <Input value={headline} onChange={(e) => onHeadline(e.target.value)} placeholder="Shown in the ad instead of the default title" />
        </Field>
        <Field label="Destination URL override (optional)">
          <Input value={destinationUrl} onChange={(e) => onDestinationUrl(e.target.value)} placeholder="https://…" />
        </Field>
      </div>
    </div>
  );
}

function PostPicker({ contentId, onSelect }: { contentId: string | null; onSelect: (id: string, label: string) => void }) {
  const { data, isLoading } = useFeed('mine');
  const posts: FeedPostData[] = data?.pages.flatMap((p) => p.items) ?? [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-ink-300" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <EmptyPickerState
        message="You don't have any posts yet"
        hint="Create a post first, then come back to promote it."
        actionHref="/app/live-feed"
        actionLabel="Go to Live Feed"
      />
    );
  }

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-ink-700 dark:text-ink-200">Choose a post to promote</p>
      <div className="max-h-80 space-y-1.5 overflow-y-auto">
        {posts.map((post) => {
          const label = post.body.slice(0, 80) || 'Untitled post';
          return (
            <PickerRow
              key={post.id}
              selected={contentId === post.id}
              onClick={() => onSelect(post.id, label)}
              title={label || 'Untitled post'}
              subtitle={`${post.likeCount} likes · ${post.commentCount} comments · ${new Date(post.createdAt).toLocaleDateString()}`}
            />
          );
        })}
      </div>
    </div>
  );
}

function JobPicker({ contentId, onSelect }: { contentId: string | null; onSelect: (id: string, label: string) => void }) {
  const { data, isLoading } = useMyPostedJobsForAds();
  const jobs = data ?? [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-ink-300" />
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <EmptyPickerState
        message="You don't have any posted jobs yet"
        hint="Post a job first, then come back to promote it."
        actionHref="/app/gigs/new"
        actionLabel="Post a job"
      />
    );
  }

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-ink-700 dark:text-ink-200">Choose a job to promote</p>
      <div className="max-h-80 space-y-1.5 overflow-y-auto">
        {jobs.map((job) => (
          <PickerRow
            key={job.id}
            selected={contentId === job.id}
            onClick={() => onSelect(job.id, job.title)}
            title={job.title}
            subtitle={[job.location, job.employmentType, job.status].filter(Boolean).join(' · ')}
          />
        ))}
      </div>
    </div>
  );
}

function CompanyPicker({ contentId, onSelect }: { contentId: string | null; onSelect: (id: string, label: string) => void }) {
  const { data, isLoading } = useMyOwnedCompaniesForAds();
  const companies = data ?? [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-ink-300" />
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <EmptyPickerState
        message="You don't own or administer any company page yet"
        hint="Create a company workspace first, then come back to promote it."
        actionHref="/app/workspace--account-switcher"
        actionLabel="Manage workspaces"
      />
    );
  }

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-ink-700 dark:text-ink-200">Choose a company page to promote</p>
      <div className="max-h-80 space-y-1.5 overflow-y-auto">
        {companies.map((company) => (
          <PickerRow key={company.id} selected={contentId === company.id} onClick={() => onSelect(company.id, company.name)} title={company.name} subtitle={`Your role: ${company.role}`} />
        ))}
      </div>
    </div>
  );
}

function PickerRow({ selected, onClick, title, subtitle }: { selected: boolean; onClick: () => void; title: string; subtitle: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between gap-2.5 rounded-lg border px-3 py-2.5 text-left',
        selected ? 'border-brand-400 bg-brand-50 dark:border-brand-500 dark:bg-brand-500/10' : 'border-ink-200 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800'
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink-900 dark:text-white">{title}</span>
        {subtitle && <span className="block truncate text-xs text-ink-500 dark:text-ink-400">{subtitle}</span>}
      </span>
      {selected && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
    </button>
  );
}

function EmptyPickerState({ message, hint, actionHref, actionLabel }: { message: string; hint: string; actionHref: string; actionLabel: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-ink-200 py-10 text-center dark:border-ink-700">
      <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">{message}</p>
      <p className="max-w-sm text-xs text-ink-400 dark:text-ink-500">{hint}</p>
      <Link href={actionHref}>
        <Button size="sm" variant="outline" className="mt-1">
          {actionLabel}
        </Button>
      </Link>
    </div>
  );
}
