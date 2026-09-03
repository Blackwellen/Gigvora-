'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { AlertTriangle, Check, Loader2, Plus, Sparkles, Trash2, Video, X } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useSession } from '@/lib/session/SessionContext';
import { useDirectorySearch, type DirectoryPerson } from '@/hooks/useChatBubbleData';
import { useCreateMeeting, useSuggestSlots, useDetectConflicts, useSuggestAgenda, type SuggestedSlot, type MeetingConflict } from '@/hooks/useMeetings';

const STEPS = ['Details', 'Participants', 'Date & Time', 'Agenda', 'Review', 'Confirm'] as const;
type Step = (typeof STEPS)[number];

type AgendaRow = { title: string; ownerUserId?: string; durationMinutes?: number; objective?: string };

type DraftState = {
  title: string;
  description: string;
  meetingType: string;
  timezone: string;
  participants: DirectoryPerson[];
  date: string; // yyyy-mm-dd
  time: string; // HH:mm
  durationMinutes: number;
  selectedSlot: SuggestedSlot | null;
  agenda: AgendaRow[];
  recurrenceRule: string;
};

const DRAFT_KEY = 'gigvora:schedule-meeting:draft';

function defaultDraft(): DraftState {
  const now = new Date();
  now.setHours(now.getHours() + 1, 0, 0, 0);
  return {
    title: '',
    description: '',
    meetingType: 'general',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    participants: [],
    date: format(now, 'yyyy-MM-dd'),
    time: format(now, 'HH:mm'),
    durationMinutes: 30,
    selectedSlot: null,
    agenda: [],
    recurrenceRule: 'none',
  };
}

export default function ScheduleMeetingWizardPage() {
  const router = useRouter();
  const { user } = useSession();
  const [step, setStep] = useState<Step>('Details');
  const [draft, setDraft] = useState<DraftState>(defaultDraft());
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [idempotencyKey] = useState(() => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`));
  const [submitError, setSubmitError] = useState<string | null>(null);

  const createMeeting = useCreateMeeting();
  const suggestSlots = useSuggestSlots();
  const detectConflicts = useDetectConflicts();
  const suggestAgenda = useSuggestAgenda();

  const [slots, setSlots] = useState<SuggestedSlot[] | null>(null);
  const [conflicts, setConflicts] = useState<MeetingConflict[] | null>(null);

  // Load any saved client-side draft on mount.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) setDraft({ ...defaultDraft(), ...JSON.parse(raw) });
    } catch {
      // ignore malformed draft
    }
    setDraftLoaded(true);
  }, []);

  function saveDraft() {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 1500);
    } catch {
      // storage unavailable — non-fatal
    }
  }

  function update<K extends keyof DraftState>(key: K, value: DraftState[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  const startsAt = useMemo(() => new Date(`${draft.date}T${draft.time}`), [draft.date, draft.time]);
  const endsAt = useMemo(() => new Date(startsAt.getTime() + draft.durationMinutes * 60_000), [startsAt, draft.durationMinutes]);

  const participantIds = draft.participants.map((p) => p.id);
  const allUserIds = useMemo(() => (user ? [user.id, ...participantIds] : participantIds), [user, participantIds]);

  const validation = useMemo(() => {
    const items: Array<{ label: string; done: boolean }> = [
      { label: 'Title added', done: draft.title.trim().length > 0 },
      { label: 'At least one participant', done: draft.participants.length > 0 },
      { label: 'Date & time set', done: !Number.isNaN(startsAt.getTime()) && startsAt.getTime() > Date.now() - 60_000 },
      { label: 'Agenda has at least one item', done: draft.agenda.length > 0 },
    ];
    return items;
  }, [draft, startsAt]);
  const isComplete = validation.every((v) => v.done);

  async function runSuggestSlots() {
    const found = await suggestSlots.mutateAsync({ userIds: allUserIds, earliestStart: new Date().toISOString(), durationMinutes: draft.durationMinutes });
    setSlots(found);
  }

  async function runDetectConflicts() {
    if (Number.isNaN(startsAt.getTime())) return;
    const found = await detectConflicts.mutateAsync({ userIds: allUserIds, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() });
    setConflicts(found);
  }

  async function runSuggestAgenda() {
    const items = await suggestAgenda.mutateAsync({ title: draft.title, description: draft.description || undefined });
    if (items.length > 0) {
      update('agenda', [...draft.agenda, ...items.map((title) => ({ title }))]);
    }
  }

  async function submit() {
    setSubmitError(null);
    try {
      const result = await createMeeting.mutateAsync({
        title: draft.title.trim(),
        description: draft.description.trim() || undefined,
        meetingType: draft.meetingType,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        timezone: draft.timezone,
        locationType: 'video',
        recurrenceRule: draft.recurrenceRule,
        participantIds,
        agendaItems: draft.agenda.map((a, i) => ({ title: a.title, ownerUserId: a.ownerUserId, durationMinutes: a.durationMinutes, objective: a.objective })).filter((a) => a.title.trim()),
        idempotencyKey,
      });
      try {
        window.localStorage.removeItem(DRAFT_KEY);
      } catch {
        // non-fatal
      }
      router.push(`/app/meeting-detail?id=${result.id}`);
    } catch {
      setSubmitError('Could not schedule this meeting. Please check your details and try again.');
    }
  }

  const stepIndex = STEPS.indexOf(step);

  if (!draftLoaded) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-ink-300" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-[-0.01em] text-ink-900 dark:text-white">Schedule meeting</h1>
          <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">Draft is saved to this browser only — not to the server — until you schedule it.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-ink-500 dark:text-ink-400">
          {savedNotice ? <span className="text-emerald-600 dark:text-emerald-400">Draft saved</span> : <span>Autosaved draft available in this browser</span>}
        </div>
      </div>

      {/* Stepper */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {STEPS.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => setStep(s)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              step === s ? 'bg-brand-600 text-white' : i < stepIndex ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400'
            }`}
          >
            {i < stepIndex && <Check className="h-3 w-3" />} {i + 1}. {s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="p-5">
          {step === 'Details' && (
            <div className="space-y-4">
              <Field label="Meeting name">
                <input
                  value={draft.title}
                  onChange={(e) => update('title', e.target.value)}
                  placeholder="e.g. Q3 kickoff sync"
                  className="h-10 w-full rounded-lg border border-ink-200 px-3 text-sm outline-none focus:border-brand-400 dark:border-ink-700 dark:bg-ink-800 dark:text-white"
                />
              </Field>
              <Field label="Description">
                <textarea
                  value={draft.description}
                  onChange={(e) => update('description', e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400 dark:border-ink-700 dark:bg-ink-800 dark:text-white"
                />
              </Field>
              <Field label="Host">
                <div className="flex items-center gap-2 rounded-lg border border-ink-100 bg-ink-50 px-3 py-2 dark:border-ink-800 dark:bg-ink-800/60">
                  <Avatar name={`${user?.first_name ?? ''} ${user?.last_name ?? ''}`} size="xs" />
                  <span className="text-sm text-ink-700 dark:text-ink-200">{user?.first_name} {user?.last_name} (you)</span>
                </div>
              </Field>
              <Field label="Meeting type">
                <select
                  value={draft.meetingType}
                  onChange={(e) => update('meetingType', e.target.value)}
                  className="h-10 w-full rounded-lg border border-ink-200 px-3 text-sm outline-none focus:border-brand-400 dark:border-ink-700 dark:bg-ink-800 dark:text-white"
                >
                  <option value="general">General</option>
                  <option value="interview">Interview</option>
                  <option value="client">Client call</option>
                  <option value="team">Team sync</option>
                </select>
              </Field>
              <Field label="Timezone">
                <input
                  value={draft.timezone}
                  onChange={(e) => update('timezone', e.target.value)}
                  className="h-10 w-full rounded-lg border border-ink-200 px-3 text-sm outline-none focus:border-brand-400 dark:border-ink-700 dark:bg-ink-800 dark:text-white"
                />
              </Field>
              <div className="rounded-lg bg-ink-50 px-3.5 py-2.5 text-xs text-ink-500 dark:bg-ink-800/60 dark:text-ink-400">
                <Video className="mr-1.5 inline h-3.5 w-3.5" /> Video call via Gigvora Call Room — a call room is created automatically when this meeting is scheduled.
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-ink-600 dark:text-ink-300">Recurrence</p>
                <select
                  value={draft.recurrenceRule}
                  onChange={(e) => update('recurrenceRule', e.target.value)}
                  className="h-10 w-full rounded-lg border border-ink-200 px-3 text-sm outline-none focus:border-brand-400 dark:border-ink-700 dark:bg-ink-800 dark:text-white"
                >
                  <option value="none">Does not repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              <ComingSoonSection title="Reminders" />
              <ComingSoonSection title="Permissions" />
              <ComingSoonSection title="Attachments" />
            </div>
          )}

          {step === 'Participants' && <ParticipantsStep draft={draft} update={update} />}

          {step === 'Date & Time' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date">
                  <input type="date" value={draft.date} onChange={(e) => update('date', e.target.value)} className="h-10 w-full rounded-lg border border-ink-200 px-3 text-sm outline-none focus:border-brand-400 dark:border-ink-700 dark:bg-ink-800 dark:text-white" />
                </Field>
                <Field label="Start time">
                  <input type="time" value={draft.time} onChange={(e) => update('time', e.target.value)} className="h-10 w-full rounded-lg border border-ink-200 px-3 text-sm outline-none focus:border-brand-400 dark:border-ink-700 dark:bg-ink-800 dark:text-white" />
                </Field>
              </div>
              <Field label="Duration (minutes)">
                <input
                  type="number"
                  min={15}
                  step={15}
                  value={draft.durationMinutes}
                  onChange={(e) => update('durationMinutes', Number(e.target.value) || 30)}
                  className="h-10 w-32 rounded-lg border border-ink-200 px-3 text-sm outline-none focus:border-brand-400 dark:border-ink-700 dark:bg-ink-800 dark:text-white"
                />
              </Field>

              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-ink-600 dark:text-ink-300">Suggested times</p>
                  <button type="button" onClick={runSuggestSlots} disabled={suggestSlots.isPending} className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700">
                    {suggestSlots.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Find times
                  </button>
                </div>
                {slots && slots.length === 0 && <p className="mt-1.5 text-xs text-ink-400 dark:text-ink-500">No suggested times found.</p>}
                {slots && slots.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {slots.map((slot, i) => {
                      const selected = draft.selectedSlot?.startsAt === slot.startsAt;
                      return (
                        <label key={slot.startsAt} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${selected ? 'border-brand-400 bg-brand-50 dark:bg-brand-500/10' : 'border-ink-200 dark:border-ink-700'}`}>
                          <input
                            type="radio"
                            checked={selected}
                            onChange={() => {
                              update('selectedSlot', slot);
                              update('date', format(new Date(slot.startsAt), 'yyyy-MM-dd'));
                              update('time', format(new Date(slot.startsAt), 'HH:mm'));
                            }}
                          />
                          {format(new Date(slot.startsAt), 'EEE, MMM d · h:mm a')}
                          {i === 0 && <Badge tone="brand">Suggested</Badge>}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'Agenda' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-ink-900 dark:text-white">Agenda items</p>
                <button type="button" onClick={runSuggestAgenda} disabled={suggestAgenda.isPending || !draft.title.trim()} className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-40">
                  {suggestAgenda.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Suggest agenda
                </button>
              </div>
              {suggestAgenda.isSuccess && suggestAgenda.data.length === 0 && <p className="text-xs text-ink-400 dark:text-ink-500">AI suggestions unavailable right now.</p>}
              <div className="overflow-x-auto rounded-lg border border-ink-200 dark:border-ink-700">
                <table className="w-full text-left text-sm">
                  <thead className="bg-ink-50 text-xs font-semibold text-ink-500 dark:bg-ink-800/60 dark:text-ink-400">
                    <tr>
                      <th className="px-3 py-2">Topic</th>
                      <th className="px-3 py-2">Duration (min)</th>
                      <th className="px-3 py-2">Objective</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {draft.agenda.map((row, i) => (
                      <tr key={i} className="border-t border-ink-100 dark:border-ink-800">
                        <td className="px-3 py-2">
                          <input
                            value={row.title}
                            onChange={(e) => {
                              const next = [...draft.agenda];
                              next[i] = { ...row, title: e.target.value };
                              update('agenda', next);
                            }}
                            className="w-full bg-transparent text-sm outline-none"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={row.durationMinutes ?? ''}
                            onChange={(e) => {
                              const next = [...draft.agenda];
                              next[i] = { ...row, durationMinutes: Number(e.target.value) || undefined };
                              update('agenda', next);
                            }}
                            className="w-20 bg-transparent text-sm outline-none"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={row.objective ?? ''}
                            onChange={(e) => {
                              const next = [...draft.agenda];
                              next[i] = { ...row, objective: e.target.value };
                              update('agenda', next);
                            }}
                            className="w-full bg-transparent text-sm outline-none"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button type="button" onClick={() => update('agenda', draft.agenda.filter((_, idx) => idx !== i))} aria-label="Remove agenda item">
                            <Trash2 className="h-4 w-4 text-ink-400 hover:text-rose-600" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={() => update('agenda', [...draft.agenda, { title: '' }])}
                className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                <Plus className="h-3.5 w-3.5" /> Add row
              </button>
            </div>
          )}

          {step === 'Review' && (
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-bold text-ink-900 dark:text-white">{draft.title || 'Untitled meeting'}</p>
                <p className="text-ink-500 dark:text-ink-400">{draft.description || 'No description'}</p>
              </div>
              <p><span className="font-semibold text-ink-700 dark:text-ink-200">When:</span> {format(startsAt, 'EEE, MMM d · h:mm a')} – {format(endsAt, 'h:mm a')} ({draft.timezone})</p>
              <p><span className="font-semibold text-ink-700 dark:text-ink-200">Participants:</span> {draft.participants.length === 0 ? 'None added' : draft.participants.map((p) => `${p.first_name} ${p.last_name}`).join(', ')}</p>
              <p><span className="font-semibold text-ink-700 dark:text-ink-200">Agenda items:</span> {draft.agenda.length}</p>

              <div>
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-ink-700 dark:text-ink-200">Conflict check</p>
                  <button type="button" onClick={runDetectConflicts} disabled={detectConflicts.isPending} className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                    {detectConflicts.isPending ? 'Checking…' : 'Run check'}
                  </button>
                </div>
                {conflicts && conflicts.length === 0 && <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">No conflicts found.</p>}
                {conflicts && conflicts.length > 0 && (
                  <div className="mt-1.5 space-y-1.5">
                    {conflicts.map((c) => (
                      <div key={c.id} className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {c.title} overlaps ({format(new Date(c.startsAt), 'MMM d, h:mm a')})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'Confirm' && (
            <div className="space-y-4">
              <p className="text-sm text-ink-600 dark:text-ink-300">Ready to schedule &ldquo;{draft.title || 'Untitled meeting'}&rdquo;? This creates the meeting and its Gigvora Call Room for real — participants will be notified.</p>
              {submitError && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">{submitError}</p>}
              <button
                type="button"
                onClick={submit}
                disabled={!isComplete || createMeeting.isPending}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
              >
                {createMeeting.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Schedule meeting
              </button>
              {!isComplete && <p className="text-xs text-ink-400 dark:text-ink-500">Complete the checklist in the right rail before scheduling.</p>}
            </div>
          )}

          {/* Action bar */}
          <div className="mt-6 flex items-center justify-between border-t border-ink-100 pt-4 dark:border-ink-800">
            <button
              type="button"
              onClick={() => {
                try {
                  window.localStorage.removeItem(DRAFT_KEY);
                } catch {
                  // non-fatal
                }
                router.back();
              }}
              className="text-sm font-semibold text-ink-500 hover:text-ink-700 dark:text-ink-400"
            >
              Cancel
            </button>
            <div className="flex items-center gap-2">
              <button type="button" onClick={saveDraft} className="rounded-lg border border-ink-200 px-3.5 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-800">
                Save draft
              </button>
              {stepIndex > 0 && (
                <button type="button" onClick={() => setStep(STEPS[stepIndex - 1])} className="rounded-lg border border-ink-200 px-3.5 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-800">
                  Back
                </button>
              )}
              {stepIndex < STEPS.length - 1 && (
                <button type="button" onClick={() => setStep(STEPS[stepIndex + 1])} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                  Continue
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* Right rail */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Validation summary" />
            <ul className="space-y-2 px-5 pb-4 pt-3 text-sm">
              {validation.map((v) => (
                <li key={v.label} className={`flex items-center gap-2 ${v.done ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-400 dark:text-ink-500'}`}>
                  {v.done ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />} {v.label}
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="AI suggestions" />
            <div className="space-y-2.5 px-5 pb-4 pt-3 text-xs text-ink-500 dark:text-ink-400">
              <p>Use &ldquo;Find times&rdquo; in Date &amp; Time for a suggested slot, &ldquo;Run check&rdquo; in Review for a conflict check, and &ldquo;Suggest agenda&rdquo; in Agenda for AI-drafted topics.</p>
            </div>
          </Card>

          {conflicts && (
            <Card>
              <CardHeader title="Participant availability" />
              <div className="px-5 pb-4 pt-3 text-xs text-ink-500 dark:text-ink-400">
                {conflicts.length === 0 ? 'No conflicts detected for the selected time.' : `${conflicts.length} conflict${conflicts.length === 1 ? '' : 's'} detected — see Review.`}
              </div>
            </Card>
          )}
        </div>
      </div>
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

function ComingSoonSection({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-dashed border-ink-200 bg-ink-50/60 px-3.5 py-3 text-xs text-ink-400 opacity-70 dark:border-ink-700 dark:bg-ink-800/40 dark:text-ink-500">
      <p className="font-semibold text-ink-500 dark:text-ink-400">{title} — Coming soon</p>
      <p className="mt-0.5">Not available yet in this release.</p>
    </div>
  );
}

function ParticipantsStep({ draft, update }: { draft: DraftState; update: <K extends keyof DraftState>(key: K, value: DraftState[K]) => void }) {
  const { user } = useSession();
  const [query, setQuery] = useState('');
  const { data: results, isFetching } = useDirectorySearch(query);

  function toggle(person: DirectoryPerson) {
    const exists = draft.participants.some((p) => p.id === person.id);
    update('participants', exists ? draft.participants.filter((p) => p.id !== person.id) : [...draft.participants, person]);
  }

  return (
    <div className="space-y-3">
      {draft.participants.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {draft.participants.map((p) => (
            <span key={p.id} className="flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
              <Avatar name={`${p.first_name} ${p.last_name}`} size="xs" />
              {p.first_name} {p.last_name}
              <button type="button" onClick={() => toggle(p)} aria-label={`Remove ${p.first_name}`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search people to invite..."
        className="h-10 w-full rounded-lg border border-ink-200 px-3 text-sm outline-none focus:border-brand-400 dark:border-ink-700 dark:bg-ink-800 dark:text-white"
      />
      <div className="max-h-72 space-y-1 overflow-y-auto">
        {isFetching && (
          <div className="flex justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-ink-300" />
          </div>
        )}
        {results?.filter((p) => p.id !== user?.id).map((person) => {
          const selected = draft.participants.some((p) => p.id === person.id);
          return (
            <button
              key={person.id}
              type="button"
              onClick={() => toggle(person)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-ink-50 dark:hover:bg-ink-800 ${selected ? 'bg-brand-50/70 dark:bg-brand-500/10' : ''}`}
            >
              <Avatar name={`${person.first_name} ${person.last_name}`} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink-900 dark:text-white">{person.first_name} {person.last_name}</span>
                {person.headline && <span className="block truncate text-xs text-ink-500 dark:text-ink-400">{person.headline}</span>}
              </span>
              {selected && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
