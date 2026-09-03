'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import {
  Calendar,
  Check,
  Copy,
  FileText,
  Loader2,
  MessageSquare,
  Plus,
  Sparkles,
  Users,
  Video,
  XCircle,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { useSession } from '@/lib/session/SessionContext';
import {
  useMeeting,
  useUpdateMeeting,
  useCancelMeeting,
  useAddMeetingNote,
  useAddActionItem,
  useUpdateActionItem,
  type MeetingActionItem,
  type MeetingParticipant,
} from '@/hooks/useMeetings';
import { useConversationDetail, useConversationSummaryLatest, useGenerateConversationSummary } from '@/hooks/useChatBubbleData';
import { MessageThread } from '@/components/chat-bubble/MessageThread';
import { SharedFilesCard } from '@/components/chat-bubble/RightRailCards';

type TabKey = 'overview' | 'agenda' | 'notes' | 'files' | 'messages' | 'ai-summary';

export default function MeetingDetailPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <MeetingDetailInner />
    </Suspense>
  );
}

function attendanceLabel(status: string) {
  if (status === 'accepted') return 'Going';
  if (status === 'tentative') return 'Maybe';
  if (status === 'declined') return 'Declined';
  return 'No response';
}

function MeetingDetailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const { user } = useSession();
  const { data: meeting, isLoading } = useMeeting(id);
  const updateMeeting = useUpdateMeeting();
  const cancelMeeting = useCancelMeeting();

  const [tab, setTab] = useState<TabKey>('overview');
  const [copied, setCopied] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);

  const isHost = Boolean(user && meeting && meeting.hostUserId === user.id);
  const isUpcoming = meeting?.status !== 'cancelled' && meeting?.status !== 'completed';

  async function copyLink() {
    const url = `${window.location.origin}/app/meeting-detail?id=${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — non-fatal
    }
  }

  async function handleCancel() {
    if (!id) return;
    if (!confirm('Cancel this meeting for all participants?')) return;
    await cancelMeeting.mutateAsync(id);
  }

  if (!id) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 px-4 py-24 text-center">
        <Calendar className="h-8 w-8 text-ink-300" />
        <h1 className="text-lg font-bold text-ink-900 dark:text-white">No meeting selected</h1>
        <Link href="/app/calendar" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          Go to calendar
        </Link>
      </div>
    );
  }

  if (isLoading || !meeting) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-ink-300" />
      </div>
    );
  }

  const tabs: Array<{ key: TabKey; label: string; count?: number }> = [
    { key: 'overview', label: 'Overview' },
    { key: 'agenda', label: 'Agenda', count: meeting.agendaItems.length || undefined },
    { key: 'notes', label: 'Notes', count: meeting.notes.length || undefined },
    { key: 'files', label: 'Files' },
    ...(meeting.conversationId ? [{ key: 'messages' as TabKey, label: 'Messages' }] : []),
    { key: 'ai-summary', label: 'AI Summary' },
  ];

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8">
      {/* Hero card */}
      <Card className="mb-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-xl font-bold tracking-[-0.01em] text-ink-900 dark:text-white">{meeting.title}</h1>
                <Badge tone={meeting.status === 'cancelled' ? 'danger' : meeting.status === 'completed' ? 'neutral' : 'brand'}>
                  {meeting.status === 'cancelled' ? 'Cancelled' : meeting.status === 'completed' ? 'Completed' : 'Scheduled'}
                </Badge>
              </div>
              {meeting.description && <p className="mt-1 max-w-xl text-sm text-ink-500 dark:text-ink-400">{meeting.description}</p>}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-500 dark:text-ink-400">
                <span>{format(new Date(meeting.startsAt), 'EEE, MMM d · h:mm a')} – {format(new Date(meeting.endsAt), 'h:mm a')}</span>
                <span>{Math.round((new Date(meeting.endsAt).getTime() - new Date(meeting.startsAt).getTime()) / 60000)} min</span>
                <span className="flex items-center gap-1"><Video className="h-3 w-3" /> Video Call</span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-ink-500 dark:text-ink-400">
                <Avatar name={meeting.host.name} size="xs" src={meeting.host.avatarUrl} />
                Hosted by {meeting.host.name}
              </div>
              <div className="mt-2 flex -space-x-2">
                {meeting.participants.slice(0, 6).map((p) => (
                  <Avatar key={p.id} name={p.name} src={p.avatarUrl} size="xs" className="ring-2 ring-white dark:ring-ink-900" />
                ))}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2">
            {isUpcoming && (
              <Link
                href={`/app/call-room?meetingId=${meeting.id}`}
                className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
              >
                <Video className="h-4 w-4" /> Join meeting
              </Link>
            )}
            {isHost && isUpcoming && (
              <button
                type="button"
                onClick={() => setRescheduleOpen(true)}
                className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-ink-200 px-4 text-sm font-semibold text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-800"
              >
                Reschedule
              </button>
            )}
            <button
              type="button"
              onClick={copyLink}
              className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-ink-200 px-4 text-sm font-semibold text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-800"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />} Copy link
            </button>
            {isHost && isUpcoming && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelMeeting.isPending}
                className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-red-200 px-4 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                <XCircle className="h-4 w-4" /> Cancel meeting
              </button>
            )}
          </div>
        </div>
      </Card>

      <Tabs tabs={tabs} value={tab} onChange={(k) => setTab(k as TabKey)} className="mb-5" />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {tab === 'overview' && <OverviewTab meeting={meeting} />}
          {tab === 'agenda' && <AgendaTab meeting={meeting} />}
          {tab === 'notes' && <NotesTab meeting={meeting} />}
          {tab === 'files' && (
            <Card>
              <CardHeader title="Shared files" />
              {meeting.conversationId ? (
                <FilesTabContent conversationId={meeting.conversationId} />
              ) : (
                <p className="px-5 pb-4 pt-2 text-sm text-ink-400 dark:text-ink-500">No linked conversation to source shared files from.</p>
              )}
            </Card>
          )}
          {tab === 'messages' && meeting.conversationId && (
            <Card className="flex h-[600px] flex-col overflow-hidden">
              <MessageThread
                conversationId={meeting.conversationId}
                title={meeting.title}
                participantsById={Object.fromEntries(meeting.participants.filter((p) => p.userId).map((p) => [p.userId as string, p.name]))}
              />
            </Card>
          )}
          {tab === 'ai-summary' && <AiSummaryTab conversationId={meeting.conversationId ?? null} />}
        </div>

        {/* Right rail */}
        <div className="space-y-4">
          <ParticipantStatusCard participants={meeting.participants} />
          {meeting.conversationId && <SharedFilesCard conversationId={meeting.conversationId} />}
          {meeting.conversationId && <AiSummaryTab conversationId={meeting.conversationId} compact />}
        </div>
      </div>

      {rescheduleOpen && (
        <RescheduleModal
          meetingId={meeting.id}
          startsAt={meeting.startsAt}
          endsAt={meeting.endsAt}
          onClose={() => setRescheduleOpen(false)}
        />
      )}
    </div>
  );
}

function FilesTabContent({ conversationId }: { conversationId: string }) {
  const { data, isLoading } = useConversationDetail(conversationId);
  const files = data?.sharedFiles || [];
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-4 w-4 animate-spin text-ink-300" />
      </div>
    );
  }
  if (files.length === 0) {
    return <p className="px-5 pb-4 pt-2 text-sm text-ink-400 dark:text-ink-500">No files shared in the linked conversation yet.</p>;
  }
  return (
    <ul className="space-y-2 px-5 pb-4 pt-2">
      {files.map((f) => (
        <li key={f.id} className="flex items-center gap-2.5">
          <FileText className="h-4 w-4 shrink-0 text-ink-400" />
          <a href={f.url} target="_blank" rel="noreferrer" className="truncate text-sm font-semibold text-brand-700 hover:underline dark:text-brand-400">
            {f.fileName}
          </a>
        </li>
      ))}
    </ul>
  );
}

function OverviewTab({ meeting }: { meeting: NonNullable<ReturnType<typeof useMeeting>['data']> }) {
  return (
    <>
      {meeting.agendaItems.length > 0 && (
        <Card>
          <CardHeader title="Agenda" />
          <ol className="space-y-2.5 px-5 pb-4 pt-3">
            {meeting.agendaItems.map((item, i) => (
              <li key={item.id} className="flex items-start gap-2.5 text-sm">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-100 text-[10px] font-bold text-ink-600 dark:bg-ink-800 dark:text-ink-300">{i + 1}</span>
                <div>
                  <p className="font-semibold text-ink-900 dark:text-white">{item.title}</p>
                  {item.durationMinutes && <p className="text-xs text-ink-400 dark:text-ink-500">{item.durationMinutes} min</p>}
                </div>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {meeting.notes.length > 0 && (
        <Card>
          <CardHeader title="Notes" />
          <ul className="space-y-3 px-5 pb-4 pt-3">
            {meeting.notes.map((n) => (
              <li key={n.id} className="text-sm text-ink-700 dark:text-ink-200">
                <p className="whitespace-pre-wrap">{n.body}</p>
                <p className="mt-0.5 text-[10px] text-ink-400 dark:text-ink-500">
                  {n.authorName} · {format(new Date(n.createdAt), 'MMM d, h:mm a')}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ActionItemsCard meeting={meeting} />

      <Card>
        <CardHeader title="Trust & safety" />
        <p className="px-5 pb-4 pt-2 text-xs text-ink-500 dark:text-ink-400">
          This meeting and its call room are subject to Gigvora&rsquo;s Acceptable Use Policy. Media is encrypted in transit.
        </p>
      </Card>
    </>
  );
}

function ActionItemsCard({ meeting }: { meeting: NonNullable<ReturnType<typeof useMeeting>['data']> }) {
  const updateActionItem = useUpdateActionItem();
  const addActionItem = useAddActionItem();
  const [draft, setDraft] = useState('');

  async function toggle(item: MeetingActionItem) {
    await updateActionItem.mutateAsync({ meetingId: meeting.id, actionItemId: item.id, status: item.status === 'done' ? 'open' : 'done' });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const title = draft.trim();
    if (!title) return;
    setDraft('');
    await addActionItem.mutateAsync({ id: meeting.id, title });
  }

  return (
    <Card>
      <CardHeader title="AI insights & action items" action={<Badge tone="brand">Beta</Badge>} />
      <div className="space-y-2.5 px-5 pb-4 pt-3">
        {meeting.actionItems.length === 0 && <p className="text-sm text-ink-400 dark:text-ink-500">No action items yet.</p>}
        {meeting.actionItems.map((item) => (
          <label key={item.id} className="flex items-start gap-2.5 text-sm">
            <input type="checkbox" checked={item.status === 'done'} onChange={() => toggle(item)} className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500" />
            <span className={item.status === 'done' ? 'text-ink-400 line-through dark:text-ink-500' : 'text-ink-800 dark:text-ink-100'}>
              {item.title}
              {item.ownerName && <span className="ml-1.5 text-xs text-ink-400 dark:text-ink-500">· {item.ownerName}</span>}
              {item.dueAt && <span className="ml-1.5 text-xs text-ink-400 dark:text-ink-500">· due {format(new Date(item.dueAt), 'MMM d')}</span>}
            </span>
          </label>
        ))}
        <form onSubmit={submit} className="flex items-center gap-2 pt-1.5">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add an action item..."
            className="h-9 flex-1 rounded-lg border border-ink-200 px-3 text-sm outline-none focus:border-brand-400 dark:border-ink-700 dark:bg-ink-800 dark:text-white"
          />
          <button type="submit" disabled={!draft.trim() || addActionItem.isPending} className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white disabled:opacity-40">
            <Plus className="h-4 w-4" />
          </button>
        </form>
      </div>
    </Card>
  );
}

function AgendaTab({ meeting }: { meeting: NonNullable<ReturnType<typeof useMeeting>['data']> }) {
  if (meeting.agendaItems.length === 0) {
    return (
      <Card>
        <CardHeader title="Agenda" />
        <p className="px-5 pb-4 pt-2 text-sm text-ink-400 dark:text-ink-500">No agenda items set for this meeting.</p>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader title="Agenda" />
      <ul className="divide-y divide-ink-100 dark:divide-ink-800">
        {meeting.agendaItems.map((item, i) => (
          <li key={item.id} className="flex items-start gap-3 px-5 py-3.5">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-bold text-ink-600 dark:bg-ink-800 dark:text-ink-300">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink-900 dark:text-white">{item.title}</p>
              {item.objective && <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{item.objective}</p>}
              {item.durationMinutes && <p className="mt-0.5 text-xs text-ink-400 dark:text-ink-500">{item.durationMinutes} min</p>}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function NotesTab({ meeting }: { meeting: NonNullable<ReturnType<typeof useMeeting>['data']> }) {
  const addNote = useAddMeetingNote();
  const [draft, setDraft] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    await addNote.mutateAsync({ id: meeting.id, body });
  }

  return (
    <Card>
      <CardHeader title="Notes" />
      <div className="space-y-3 px-5 pb-4 pt-3">
        {meeting.notes.length === 0 && <p className="text-sm text-ink-400 dark:text-ink-500">No notes yet.</p>}
        {meeting.notes.map((n) => (
          <div key={n.id} className="rounded-lg bg-ink-50 px-3.5 py-2.5 dark:bg-ink-800/60">
            <p className="whitespace-pre-wrap text-sm text-ink-700 dark:text-ink-200">{n.body}</p>
            <p className="mt-1 text-[10px] text-ink-400 dark:text-ink-500">
              {n.authorName} · {format(new Date(n.createdAt), 'MMM d, h:mm a')}
            </p>
          </div>
        ))}
        <form onSubmit={submit} className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a note..."
            rows={3}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400 dark:border-ink-700 dark:bg-ink-800 dark:text-white"
          />
          <button type="submit" disabled={!draft.trim() || addNote.isPending} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40">
            {addNote.isPending ? 'Saving…' : 'Add note'}
          </button>
        </form>
      </div>
    </Card>
  );
}

function AiSummaryTab({ conversationId, compact }: { conversationId: string | null; compact?: boolean }) {
  const { data: summary, isLoading } = useConversationSummaryLatest(conversationId);
  const generate = useGenerateConversationSummary();

  if (!conversationId) {
    if (compact) return null;
    return (
      <Card>
        <CardHeader title="AI Summary" action={<Badge tone="brand">Beta</Badge>} />
        <p className="px-5 pb-4 pt-2 text-sm text-ink-400 dark:text-ink-500">AI summary requires a linked conversation, which this meeting doesn&rsquo;t have.</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title={compact ? 'AI smart summary' : 'AI Summary'} action={<Badge tone="brand">Beta</Badge>} />
      <div className="space-y-3 px-5 pb-4 pt-3">
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-ink-300" />
        ) : summary ? (
          <p className="text-sm text-ink-600 dark:text-ink-300">{summary.summary}</p>
        ) : (
          <p className="text-sm text-ink-400 dark:text-ink-500">No summary generated yet.</p>
        )}
        <button
          type="button"
          onClick={() => generate.mutate(conversationId)}
          disabled={generate.isPending}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 text-xs font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-50 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400"
        >
          <Sparkles className="h-3.5 w-3.5" /> {summary ? 'Regenerate' : 'Generate'} summary
        </button>
      </div>
    </Card>
  );
}

function ParticipantStatusCard({ participants }: { participants: MeetingParticipant[] }) {
  const groups: Record<string, MeetingParticipant[]> = { accepted: [], tentative: [], no_response: [], declined: [] };
  for (const p of participants) {
    const key = groups[p.attendanceStatus] ? p.attendanceStatus : 'no_response';
    groups[key].push(p);
  }
  return (
    <Card>
      <CardHeader title="Participant status" />
      <div className="space-y-3 px-5 pb-4 pt-3">
        {([
          ['accepted', 'Going'],
          ['tentative', 'Maybe'],
          ['no_response', 'No response'],
          ['declined', 'Declined'],
        ] as const).map(([key, label]) =>
          groups[key].length > 0 ? (
            <div key={key}>
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink-500 dark:text-ink-400">
                <Users className="h-3.5 w-3.5" /> {label} ({groups[key].length})
              </p>
              <div className="space-y-1.5">
                {groups[key].map((p) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <Avatar name={p.name} src={p.avatarUrl} size="xs" />
                    <span className="truncate text-xs text-ink-700 dark:text-ink-200">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null
        )}
      </div>
    </Card>
  );
}

function RescheduleModal({ meetingId, startsAt, endsAt, onClose }: { meetingId: string; startsAt: string; endsAt: string; onClose: () => void }) {
  const updateMeeting = useUpdateMeeting();
  const [date, setDate] = useState(format(new Date(startsAt), "yyyy-MM-dd'T'HH:mm"));
  const durationMinutes = Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    try {
      const newStart = new Date(date);
      const newEnd = new Date(newStart.getTime() + durationMinutes * 60000);
      await updateMeeting.mutateAsync({ id: meetingId, startsAt: newStart.toISOString(), endsAt: newEnd.toISOString() });
      onClose();
    } catch {
      setError('Could not reschedule this meeting.');
    }
  }

  return (
    <Modal open onClose={onClose} className="max-w-sm">
      <ModalHeader title="Reschedule meeting" onClose={onClose} />
      <div className="space-y-3 p-5">
        <label className="block text-xs font-semibold text-ink-600 dark:text-ink-300">
          New date &amp; time
          <input
            data-autofocus
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-ink-200 px-3 text-sm outline-none focus:border-brand-400 dark:border-ink-700 dark:bg-ink-800 dark:text-white"
          />
        </label>
        <p className="text-xs text-ink-400 dark:text-ink-500">Duration ({durationMinutes} min) is kept the same.</p>
        {error && <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>}
        <button
          type="button"
          onClick={submit}
          disabled={updateMeeting.isPending}
          className="flex h-10 w-full items-center justify-center rounded-lg bg-brand-600 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {updateMeeting.isPending ? 'Saving…' : 'Save new time'}
        </button>
      </div>
    </Modal>
  );
}
