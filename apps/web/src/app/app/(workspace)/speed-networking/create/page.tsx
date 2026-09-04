'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Rocket, Timer, Users } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import { WizardShell, type AutosaveState } from '@/components/wizard/WizardShell';
import { WizardStepper, type WizardStep } from '@/components/wizard/WizardStepper';

type Session = {
  id: string;
  title: string;
  description: string | null;
  format: 'rapid_2m' | 'rapid_5m' | 'rapid_10m' | 'full_length';
  capacity: number;
  priceCents: number;
  startsAt: string;
  status: string;
  wizardStep: string | null;
};

const STEPS: WizardStep[] = [
  { label: 'Format', helper: 'Choose the round length' },
  { label: 'Capacity & price', helper: 'Set seats and (optional) ticket price' },
  { label: 'Schedule', helper: 'Pick when it runs' },
  { label: 'Review', helper: 'Publish your session' },
];

const FORMATS: { key: Session['format']; label: string; hint: string }[] = [
  { key: 'rapid_2m', label: '2-minute rounds', hint: 'Fast and high-energy — best for large groups' },
  { key: 'rapid_5m', label: '5-minute rounds', hint: 'The classic speed-networking pace' },
  { key: 'rapid_10m', label: '10-minute rounds', hint: 'More time to go deeper per conversation' },
  { key: 'full_length', label: 'Full-length session', hint: 'One open-ended room, no rotation' },
];

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Speed Networking creation wizard (Phase 1 of the phased plan — see .claude/plans). Mirrors
 * OnboardingWizard.tsx's convention (WizardShell/WizardStepper, server-persisted state, debounced
 * autosave) but with a lighter one-entity-PATCHed-per-step model rather than a generic
 * step-response table, since these steps are fixed rather than schema-driven.
 *
 * Paid tickets aren't wired up yet (Phase 2) — price is disabled with a "coming soon" note and
 * publish is blocked server-side for price_cents > 0 until then.
 */
export default function CreateSpeedNetworkingSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const existingId = searchParams.get('sessionId');

  const [session, setSession] = useState<Session | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [title, setTitle] = useState('');
  const [format, setFormat] = useState<Session['format']>('rapid_5m');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState(20);
  const [startsAt, setStartsAt] = useState('');
  const [autosaveState, setAutosaveState] = useState<AutosaveState>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!existingId) return;
    api
      .get<{ data: Session }>(`/speed-networking/sessions/${existingId}`)
      .then((res) => {
        const s = res.data.data;
        setSession(s);
        setTitle(s.title);
        setFormat(s.format);
        setDescription(s.description || '');
        setCapacity(s.capacity);
        setStartsAt(toLocalInputValue(s.startsAt));
        const idx = STEPS.findIndex((st) => st.label.toLowerCase().startsWith((s.wizardStep || 'format').split(' ')[0]));
        setStepIndex(idx >= 0 ? idx : 0);
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Could not load this session.')));
  }, [existingId]);

  const persist = useCallback(
    async (patch: Record<string, unknown>) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setAutosaveState('saving');
        try {
          if (!session) {
            if (!title.trim()) return; // need a title before the first save creates the session
            const res = await api.post<{ data: Session }>('/speed-networking/sessions', { title, format, ...patch });
            setSession(res.data.data);
            router.replace(`/app/speed-networking/create?sessionId=${res.data.data.id}`);
          } else {
            const res = await api.patch<{ data: Session }>(`/speed-networking/sessions/${session.id}`, patch);
            setSession(res.data.data);
          }
          setAutosaveState('saved');
          setLastSavedAt(new Date());
        } catch (err) {
          setAutosaveState('error');
          setError(getApiErrorMessage(err, 'Could not save your changes.'));
        }
      }, 900);
    },
    [session, title, format, router]
  );

  function goTo(index: number) {
    setStepIndex(index);
    persist({ wizardStep: STEPS[index].label.toLowerCase().split(' ')[0] });
  }

  async function handlePublish() {
    if (!session) return;
    setPublishing(true);
    setError(null);
    try {
      await api.post(`/speed-networking/sessions/${session.id}/publish`);
      router.push(`/app/speed-networking/sessions/${session.id}/manage`);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not publish this session.'));
    } finally {
      setPublishing(false);
    }
  }

  const currentStep = STEPS[stepIndex];

  return (
    <WizardShell
      pageId="speed-networking-create"
      pageName="Create Speed Networking Session"
      route="/app/speed-networking/create"
      hideBrandHeader
      autosaveState={session ? autosaveState : undefined}
      lastSavedAt={lastSavedAt}
      maxWidthClassName="max-w-3xl"
    >
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink-900">Host a Speed Networking session</h1>
        <p className="mt-1 text-sm text-ink-500">Set up rapid-round video networking in a few steps.</p>
      </div>

      <WizardStepper steps={STEPS} currentIndex={stepIndex} />

      {error && <div className="mt-4 rounded-panel border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="mt-6 rounded-panel border border-ink-100 bg-white p-6 shadow-surface">
        {currentStep.label === 'Format' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-ink-800">Session title</label>
              <input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  persist({ title: e.target.value });
                }}
                placeholder="e.g. Fintech Founders Speed Networking"
                className="mt-1 w-full rounded-control border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-ink-800">Round format</label>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {FORMATS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => {
                      setFormat(f.key);
                      persist({ format: f.key });
                    }}
                    className={`flex items-start gap-2 rounded-panel border p-3 text-left text-sm transition ${
                      format === f.key ? 'border-brand-500 bg-brand-50' : 'border-ink-200 hover:border-ink-300'
                    }`}
                  >
                    <Timer className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                    <span>
                      <span className="block font-semibold text-ink-900">{f.label}</span>
                      <span className="text-xs text-ink-500">{f.hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-ink-800">Description</label>
              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  persist({ description: e.target.value });
                }}
                rows={3}
                className="mt-1 w-full rounded-control border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </div>
          </div>
        )}

        {currentStep.label === 'Capacity & price' && (
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-ink-800">
                <Users className="h-4 w-4 text-ink-400" /> Capacity (max checked-in participants)
              </label>
              <input
                type="number"
                min={2}
                max={200}
                value={capacity}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setCapacity(v);
                  persist({ capacity: v });
                }}
                className="mt-1 w-40 rounded-control border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
              <p className="mt-1 text-xs text-ink-400">Up to {Math.floor(capacity / 2)} simultaneous 1:1 video rounds.</p>
            </div>
            <div className="rounded-panel border border-dashed border-ink-200 bg-ink-50 p-3 text-sm text-ink-500">
              Paid tickets are coming soon — for now every session is free to join.
            </div>
          </div>
        )}

        {currentStep.label === 'Schedule' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-ink-800">Starts at</label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => {
                  setStartsAt(e.target.value);
                  persist({ startsAt: new Date(e.target.value).toISOString() });
                }}
                className="mt-1 w-full rounded-control border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </div>
          </div>
        )}

        {currentStep.label === 'Review' && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-ink-400">Title</dt>
              <dd className="text-ink-800">{title || '—'}</dd>
              <dt className="text-ink-400">Format</dt>
              <dd className="text-ink-800">{FORMATS.find((f) => f.key === format)?.label}</dd>
              <dt className="text-ink-400">Capacity</dt>
              <dd className="text-ink-800">{capacity}</dd>
              <dt className="text-ink-400">Starts</dt>
              <dd className="text-ink-800">{startsAt ? new Date(startsAt).toLocaleString() : '—'}</dd>
            </dl>
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing || !session}
              className="flex items-center gap-1.5 rounded-control bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />} Publish session
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => goTo(Math.max(0, stepIndex - 1))}
          disabled={stepIndex === 0}
          className="rounded-control border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-600 hover:bg-ink-50 disabled:opacity-40"
        >
          Back
        </button>
        {stepIndex < STEPS.length - 1 && (
          <button
            type="button"
            onClick={() => goTo(stepIndex + 1)}
            disabled={!title.trim()}
            className="rounded-control bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            Continue
          </button>
        )}
      </div>
    </WizardShell>
  );
}
