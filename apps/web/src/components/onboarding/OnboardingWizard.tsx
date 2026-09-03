'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, ChevronRight, Sparkles, XCircle, FileUp } from 'lucide-react';
import { WizardShell, AutosaveIndicator, type AutosaveState } from '@/components/wizard/WizardShell';
import { WizardStepper } from '@/components/wizard/WizardStepper';
import { Button } from '@/components/ui/Button';
import { getApiErrorMessage } from '@/lib/api';
import { useSession } from '@/lib/session/SessionContext';
import { useRecentImports } from '@/lib/imports/useImports';
import {
  useOnboardingConfig,
  useOnboardingSession,
  useOnboardingSessionByTrack,
  useSaveOnboardingStep,
  useCompleteOnboardingSession,
} from '@/lib/onboarding/useOnboardingSession';
import { OnboardingStepForm, type OnboardingDraft } from './OnboardingStepForm';
import { humanizeFieldKey } from './fieldLabels';
import { useOpportunityMatches } from './useOpportunityMatches';
import type { OnboardingStepConfig, OnboardingTrack } from '@/lib/onboarding/types';

export type OnboardingWizardCopy = {
  pageId: string;
  breadcrumb: string;
  title: string;
  subtitle: string;
  /** Import affordance shown on step 1, if this track has a matching real import pipeline. */
  importAffordance?: { label: string; href: string }[];
  /** Whether to show the (real, ML-backed) opportunity matches card in the right rail. */
  showOpportunityMatches?: boolean;
  /** Whether to show a conditional "imported data" card, and which import types feed it. */
  importedDataTypes?: Array<{ importType: 'cv' | 'profile' | 'company'; label: string; reviewHref: string }>;
};

const REVIEW_STEP_KEY = '__review__';

export function OnboardingWizard({ track, copy }: { track: OnboardingTrack; copy: OnboardingWizardCopy }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeSessionId = searchParams.get('sessionId');
  const { user } = useSession();

  const config = useOnboardingConfig(track);
  const sessionByTrack = useOnboardingSessionByTrack(track, { enabled: !resumeSessionId });
  const sessionById = useOnboardingSession(resumeSessionId);
  const session = resumeSessionId ? sessionById.data : sessionByTrack.data;
  const sessionLoading = resumeSessionId ? sessionById.isLoading : sessionByTrack.isLoading;

  // Once a fresh get-or-create session resolves, put its id in the URL so a refresh resumes it.
  useEffect(() => {
    if (!resumeSessionId && sessionByTrack.data?.id) {
      router.replace(`?sessionId=${sessionByTrack.data.id}`, { scroll: false });
    }
  }, [resumeSessionId, sessionByTrack.data?.id, router]);

  const steps = useMemo(
    () => [...(config.data?.steps ?? [])].sort((a, b) => a.step_order - b.step_order),
    [config.data?.steps]
  );

  const [stepIndex, setStepIndex] = useState(0);
  const [hasResumedStep, setHasResumedStep] = useState(false);
  const isReviewStep = stepIndex === steps.length;
  const currentStep: OnboardingStepConfig | undefined = steps[stepIndex];

  // Jump to the session's current_step_key once, the first time the session loads.
  useEffect(() => {
    if (hasResumedStep || !session || steps.length === 0) return;
    const idx = steps.findIndex((s) => s.step_key === session.current_step_key);
    setStepIndex(idx >= 0 ? idx : 0);
    setHasResumedStep(true);
  }, [hasResumedStep, session, steps]);

  const [draft, setDraft] = useState<OnboardingDraft>({});
  const [loadedStepKey, setLoadedStepKey] = useState<string | null>(null);
  const [showRequiredErrors, setShowRequiredErrors] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!session || !currentStep) return;
    if (loadedStepKey === currentStep.step_key) return;
    const existing = session.responses.find((r) => r.step_key === currentStep.step_key);
    setDraft(existing?.response_json ?? {});
    setShowRequiredErrors(false);
    setLoadedStepKey(currentStep.step_key);
  }, [session, currentStep, loadedStepKey]);

  const saveStep = useSaveOnboardingStep(session?.id);
  const completeSession = useCompleteOnboardingSession(session?.id);

  const requiredSatisfied = useMemo(() => {
    if (!currentStep) return false;
    return (currentStep.schema_json?.fields ?? []).every(
      (f) => !f.required || (draft[f.key] !== undefined && draft[f.key] !== null && draft[f.key] !== '')
    );
  }, [currentStep, draft]);

  // Debounced autosave — only fires once the current step's required fields are all filled in,
  // since the server's validateStepResponse (onboarding.validation.js) rejects a partial response
  // missing a required field. This avoids autosaving into a guaranteed 422.
  useEffect(() => {
    if (!session || !currentStep || !requiredSatisfied || isReviewStep) return;
    const timer = setTimeout(() => {
      saveStep.mutate(
        { stepKey: currentStep.step_key, response: draft },
        {
          onSuccess: () => setLastSavedAt(new Date()),
          onError: (err) => setError(getApiErrorMessage(err)),
        }
      );
    }, 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, requiredSatisfied, currentStep?.step_key, session?.id]);

  async function handleSaveDraft() {
    if (!currentStep || !requiredSatisfied) return;
    setError(null);
    try {
      await saveStep.mutateAsync({ stepKey: currentStep.step_key, response: draft });
      setLastSavedAt(new Date());
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  async function handleContinue() {
    if (!currentStep) return;
    setError(null);
    if (!requiredSatisfied) {
      setShowRequiredErrors(true);
      return;
    }
    try {
      await saveStep.mutateAsync({ stepKey: currentStep.step_key, response: draft });
      setLastSavedAt(new Date());
      setStepIndex((i) => i + 1);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  function handleBack() {
    setError(null);
    setStepIndex((i) => Math.max(0, i - 1));
  }

  function jumpToStep(stepKey: string) {
    const idx = steps.findIndex((s) => s.step_key === stepKey);
    if (idx >= 0) setStepIndex(idx);
  }

  const completedStepKeys = useMemo(
    () => new Set(session?.responses.filter((r) => r.completed_at).map((r) => r.step_key) ?? []),
    [session?.responses]
  );
  const requiredStepKeys = useMemo(() => steps.filter((s) => s.is_required).map((s) => s.step_key), [steps]);
  const missingRequiredSteps = requiredStepKeys.filter((k) => !completedStepKeys.has(k));
  const canComplete = missingRequiredSteps.length === 0;

  async function handleComplete() {
    setError(null);
    try {
      await completeSession.mutateAsync();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  const autosaveState: AutosaveState = saveStep.isPending
    ? 'saving'
    : saveStep.isError
      ? 'error'
      : lastSavedAt
        ? 'saved'
        : 'idle';

  const stepperItems = [
    ...steps.map((s) => ({ label: s.title, helper: s.description ?? '' })),
    { label: 'Review & confirm', helper: 'Check everything before finishing' },
  ];

  const isComplete = completeSession.isSuccess;

  if (config.isError) {
    return (
      <WizardShell pageId={copy.pageId} pageName={copy.title} route={typeof window !== 'undefined' ? window.location.pathname : ''} hideBrandHeader>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {getApiErrorMessage(config.error, `We couldn't load the ${copy.title} setup steps. Please refresh and try again.`)}
        </div>
      </WizardShell>
    );
  }

  if (config.isLoading || sessionLoading || !session) {
    return (
      <WizardShell pageId={copy.pageId} pageName={copy.title} route={typeof window !== 'undefined' ? window.location.pathname : ''} hideBrandHeader>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 rounded bg-ink-100" />
          <div className="h-40 rounded-2xl bg-ink-100" />
        </div>
      </WizardShell>
    );
  }

  if (isComplete) {
    return (
      <WizardShell pageId={copy.pageId} pageName={copy.title} route={typeof window !== 'undefined' ? window.location.pathname : ''} hideBrandHeader>
        <OnboardingSuccess track={track} canonicalEntity={completeSession.data?.canonicalEntity ?? null} userId={user?.id} />
      </WizardShell>
    );
  }

  return (
    <WizardShell pageId={copy.pageId} pageName={copy.title} route={typeof window !== 'undefined' ? window.location.pathname : ''} hideBrandHeader>
      <nav className="mb-3 flex items-center gap-1.5 text-xs font-medium text-ink-400">
        <span>Work</span>
        <ChevronRight className="h-3 w-3" />
        <span>{copy.breadcrumb}</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-ink-600">New</span>
      </nav>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-[-0.01em] text-ink-900">{copy.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-500">{copy.subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <AutosaveIndicator state={autosaveState} lastSavedAt={lastSavedAt} onRetry={handleSaveDraft} />
          <Link href="/app/setup-checklist" className="whitespace-nowrap rounded-lg border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-600 hover:bg-brand-50">
            Save &amp; exit
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <XCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[220px_1fr_320px]">
        <nav aria-label="Onboarding steps" className="hidden lg:block">
          <ol className="space-y-1">
            {stepperItems.map((item, i) => {
              const isDone = i < steps.length && completedStepKeys.has(steps[i].step_key);
              const isCurrent = i === stepIndex;
              return (
                <li key={item.label}>
                  <button
                    type="button"
                    onClick={() => (i <= steps.length ? setStepIndex(i) : undefined)}
                    className={
                      'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm ' +
                      (isCurrent ? 'bg-brand-50 font-semibold text-brand-700' : 'text-ink-500 hover:bg-ink-50')
                    }
                  >
                    <span
                      className={
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ' +
                        (isDone ? 'bg-brand-600 text-white' : isCurrent ? 'border-2 border-brand-600 text-brand-700' : 'border border-ink-200 text-ink-400')
                      }
                    >
                      {isDone ? '✓' : i + 1}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="space-y-6">
          <div className="mb-2 rounded-2xl border border-ink-100 bg-white p-4 lg:hidden">
            <WizardStepper steps={stepperItems} currentIndex={stepIndex} />
          </div>

          <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-surface">
            {!isReviewStep && currentStep && (
              <>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-ink-900">
                    {stepIndex + 1}. {currentStep.title}
                  </h2>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    {loadedStepKey === currentStep.step_key && requiredSatisfied ? 'All changes saved' : 'In progress'}
                  </span>
                </div>
                {currentStep.description && <p className="-mt-3 mb-5 text-sm text-ink-500">{currentStep.description}</p>}

                {stepIndex === 0 && copy.importAffordance && copy.importAffordance.length > 0 && (
                  <div className="mb-5 flex flex-wrap gap-2 rounded-xl border border-dashed border-ink-200 bg-ink-50/60 p-3">
                    {copy.importAffordance.map((a) => (
                      <Link
                        key={a.href}
                        href={a.href}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:border-brand-300 hover:text-brand-700"
                      >
                        <FileUp className="h-3.5 w-3.5" /> {a.label}
                      </Link>
                    ))}
                  </div>
                )}

                <OnboardingStepForm
                  schema={currentStep.schema_json}
                  draft={draft}
                  onChange={(key, value) => setDraft((d) => ({ ...d, [key]: value }))}
                  showRequiredErrors={showRequiredErrors}
                />

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                  <Button variant="outline" onClick={handleBack} disabled={stepIndex === 0}>
                    Back
                  </Button>
                  <div className="flex items-center gap-3">
                    <Button variant="secondary" onClick={handleSaveDraft} disabled={!requiredSatisfied} loading={saveStep.isPending}>
                      Save draft
                    </Button>
                    <Button onClick={handleContinue} loading={saveStep.isPending}>
                      Continue
                    </Button>
                  </div>
                </div>
              </>
            )}

            {isReviewStep && (
              <ReviewStep
                steps={steps}
                session={session}
                missingRequiredSteps={missingRequiredSteps}
                canComplete={canComplete}
                onJumpToStep={jumpToStep}
                onBack={handleBack}
                onComplete={handleComplete}
                completing={completeSession.isPending}
              />
            )}
          </div>

          {!isReviewStep && missingRequiredSteps.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
              {missingRequiredSteps.length} required step{missingRequiredSteps.length === 1 ? '' : 's'} still need
              {missingRequiredSteps.length === 1 ? 's' : ''} to be completed before you can finish.
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <ProgressCard totalSteps={steps.length} completedCount={completedStepKeys.size} />
          <NextStepCard steps={steps} completedStepKeys={completedStepKeys} onJump={jumpToStep} />
          {copy.importedDataTypes && copy.importedDataTypes.length > 0 && <ImportedDataCard entries={copy.importedDataTypes} />}
          {copy.showOpportunityMatches && <OpportunityMatchesCard />}
          {!copy.showOpportunityMatches && !copy.importedDataTypes && <SetupTipsCard track={track} />}
        </aside>
      </div>
    </WizardShell>
  );
}

function ReviewStep({
  steps,
  session,
  missingRequiredSteps,
  canComplete,
  onJumpToStep,
  onBack,
  onComplete,
  completing,
}: {
  steps: OnboardingStepConfig[];
  session: NonNullable<ReturnType<typeof useOnboardingSession>['data']>;
  missingRequiredSteps: string[];
  canComplete: boolean;
  onJumpToStep: (stepKey: string) => void;
  onBack: () => void;
  onComplete: () => void;
  completing: boolean;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold text-ink-900">Review &amp; confirm</h2>
      <p className="mt-1 text-sm text-ink-500">Check your answers below, then finish setting up.</p>

      <div className="mt-5 space-y-4">
        {steps.map((step) => {
          const response = session.responses.find((r) => r.step_key === step.step_key);
          const fields = step.schema_json?.fields ?? [];
          return (
            <div key={step.step_key} className="rounded-xl border border-ink-100 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-ink-900">{step.title}</p>
                <button type="button" onClick={() => onJumpToStep(step.step_key)} className="text-xs font-semibold text-brand-600 hover:underline">
                  Edit
                </button>
              </div>
              {!response ? (
                <p className="mt-1.5 text-sm text-ink-400">Not completed yet.</p>
              ) : (
                <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
                  {fields.map((f) => {
                    const v = response.response_json?.[f.key];
                    if (v === undefined || v === null || v === '') return null;
                    return (
                      <div key={f.key} className="text-sm">
                        <dt className="text-ink-400">{f.label ?? humanizeFieldKey(f.key)}</dt>
                        <dd className="font-medium text-ink-800">{Array.isArray(v) ? v.join(', ') : String(v)}</dd>
                      </div>
                    );
                  })}
                </dl>
              )}
            </div>
          );
        })}
      </div>

      {!canComplete && (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Finish these required steps first: {missingRequiredSteps.map((k) => steps.find((s) => s.step_key === k)?.title ?? k).join(', ')}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onComplete} disabled={!canComplete} loading={completing}>
          Complete setup
        </Button>
      </div>
    </div>
  );
}

function ProgressCard({ totalSteps, completedCount }: { totalSteps: number; completedCount: number }) {
  const pct = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5">
      <h3 className="text-sm font-bold text-ink-900">Your onboarding progress</h3>
      <div className="mt-4 flex items-center gap-4">
        <svg width="72" height="72" viewBox="0 0 72 72" className="shrink-0 -rotate-90">
          <circle cx="36" cy="36" r={radius} fill="none" stroke="var(--tw-color-ink-100, #eee)" className="stroke-ink-100" strokeWidth="8" />
          <circle
            cx="36"
            cy="36"
            r={radius}
            fill="none"
            className="stroke-brand-600"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div>
          <p className="text-2xl font-extrabold text-ink-900">{pct}%</p>
          <p className="text-xs text-ink-400">
            {completedCount} of {totalSteps} steps
          </p>
        </div>
      </div>
    </div>
  );
}

function NextStepCard({
  steps,
  completedStepKeys,
  onJump,
}: {
  steps: OnboardingStepConfig[];
  completedStepKeys: Set<string>;
  onJump: (stepKey: string) => void;
}) {
  const next = steps.find((s) => !completedStepKeys.has(s.step_key));
  return (
    <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-5">
      <p className="flex items-center gap-1.5 text-sm font-bold text-brand-700">
        <Sparkles className="h-4 w-4" /> Suggested next
      </p>
      {next ? (
        <>
          <p className="mt-2 text-sm text-brand-700/80">
            <span className="font-semibold">{next.title}.</span> Complete this to keep your setup moving.
          </p>
          <button
            type="button"
            onClick={() => onJump(next.step_key)}
            className="mt-3 rounded-lg bg-brand-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-500"
          >
            Jump to this step
          </button>
        </>
      ) : (
        <p className="mt-2 text-sm text-brand-700/80">Every step is complete — head to Review &amp; confirm to finish up.</p>
      )}
    </div>
  );
}

function ImportedDataCard({ entries }: { entries: NonNullable<OnboardingWizardCopy['importedDataTypes']> }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5">
      <h3 className="text-sm font-bold text-ink-900">Imported data</h3>
      <div className="mt-3 space-y-2.5">
        {entries.map((entry) => (
          <ImportedDataRow key={entry.importType} entry={entry} />
        ))}
      </div>
    </div>
  );
}

function ImportedDataRow({ entry }: { entry: NonNullable<OnboardingWizardCopy['importedDataTypes']>[number] }) {
  const { data: imports } = useRecentImports(entry.importType);
  const latest = imports?.[0];

  if (!latest) {
    return (
      <Link
        href={entry.reviewHref.split('?')[0]}
        className="flex items-center justify-between rounded-lg border border-dashed border-ink-200 px-3 py-2 text-xs font-semibold text-ink-500 hover:border-brand-300 hover:text-brand-700"
      >
        {entry.label} <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2">
      <div>
        <p className="text-xs font-semibold text-ink-800">{entry.label}</p>
        <p className="text-[11px] text-ink-400">{latest.status.replace('_', ' ')}</p>
      </div>
      <Link href={`${entry.reviewHref}?importId=${latest.id}`} className="text-xs font-semibold text-brand-600 hover:underline">
        Review
      </Link>
    </div>
  );
}

function OpportunityMatchesCard() {
  const { data, isLoading } = useOpportunityMatches();
  const jobs = data?.jobs ?? [];
  const people = data?.people ?? [];
  const hasMatches = jobs.length > 0 || people.length > 0;

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5">
      <h3 className="text-sm font-bold text-ink-900">Opportunity matches</h3>
      {isLoading && <p className="mt-2 text-sm text-ink-400">Loading…</p>}
      {!isLoading && !hasMatches && (
        <p className="mt-2 text-sm text-ink-400">We&apos;ll surface opportunity matches here once we have more of your profile.</p>
      )}
      {!isLoading && hasMatches && (
        <ul className="mt-3 space-y-2">
          {jobs.slice(0, 3).map((job, i) => (
            <li key={`job-${i}`} className="rounded-lg border border-ink-100 px-3 py-2 text-xs font-semibold text-ink-800">
              {typeof job.title === 'string' ? job.title : 'Job match'}
            </li>
          ))}
          {people.slice(0, 3).map((person, i) => (
            <li key={`person-${i}`} className="rounded-lg border border-ink-100 px-3 py-2 text-xs font-semibold text-ink-800">
              {typeof person.name === 'string' ? person.name : 'Person match'}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SetupTipsCard({ track }: { track: OnboardingTrack }) {
  const TIPS: Partial<Record<OnboardingTrack, string[]>> = {
    business: ['A complete company profile helps candidates find and trust your listings.', 'Add your logo and industry to stand out in search.'],
    agency: ['List the services you offer so clients can find the right fit fast.', 'Complete client-type targeting to improve match quality.'],
    enterprise: ['Set up your workspace structure now — you can add teams and permissions later.', 'A verified domain speeds up teammate invites.'],
    recruiter: ['Set your hiring focus so job matching stays relevant.', 'Import your contacts to jump-start your pipeline.'],
    creator: ['List your platforms and niche so brands can find you.', 'Add audience size to unlock more relevant opportunities.'],
  };
  const tips = TIPS[track] ?? [];
  if (tips.length === 0) return null;
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5">
      <h3 className="text-sm font-bold text-ink-900">Setup tips</h3>
      <ul className="mt-3 space-y-2.5 text-sm text-ink-600">
        {tips.map((tip) => (
          <li key={tip} className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ink-300" /> {tip}
          </li>
        ))}
      </ul>
    </div>
  );
}

function OnboardingSuccess({
  track,
  canonicalEntity,
  userId,
}: {
  track: OnboardingTrack;
  canonicalEntity: { type: string; id: string } | null;
  userId: string | undefined;
}) {
  const individualTracks: OnboardingTrack[] = ['professional', 'graduate_student', 'career_changer', 'creator', 'recruiter'];
  const secondaryLink =
    canonicalEntity?.type === 'company'
      ? { href: '/app/workspace--account-switcher', label: 'View your workspace' }
      : individualTracks.includes(track) && userId
        ? { href: `/profile/${userId}`, label: 'View your profile' }
        : null;

  return (
    <div className="flex flex-col items-center rounded-2xl border border-ink-100 bg-white py-14 text-center">
      <CheckCircle2 className="h-12 w-12 text-emerald-500" />
      <p className="mt-4 text-xl font-bold text-ink-900">You&apos;re all set up</p>
      <p className="mt-1 max-w-sm text-sm text-ink-500">Your onboarding is complete. You can pick up any remaining setup from the checklist any time.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/app/setup-checklist" className="rounded-lg border border-ink-200 px-5 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
          Go to setup checklist
        </Link>
        {secondaryLink && (
          <Link href={secondaryLink.href} className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-500">
            {secondaryLink.label}
          </Link>
        )}
      </div>
    </div>
  );
}
