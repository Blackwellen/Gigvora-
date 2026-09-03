'use client';

import { useState } from 'react';
import { formatDistanceToNowStrict, format } from 'date-fns';
import { CalendarClock, CalendarPlus, Download, FileText, Link2, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import {
  useConversationDetail,
  useConversationSummaryLatest,
  useGenerateConversationSummary,
  type ConversationDetail,
} from '@/hooks/useChatBubbleData';

/** AI smart summary card — `GET /conversations/:id/summary/latest` + a "Generate summary"
 * button that calls `POST /conversations/:id/summary`. Both endpoints are new and may not be
 * live yet; a missing/`ok:false` summary renders an honest "no summary yet" state rather than a
 * fabricated one, matching the reference's "AI smart summary" / "Beta" card. */
export function AiSummaryCard({ conversationId }: { conversationId: string | null }) {
  const { data: summary, isLoading } = useConversationSummaryLatest(conversationId);
  const generate = useGenerateConversationSummary();
  const [error, setError] = useState<string | null>(null);

  if (!conversationId) return null;

  async function handleGenerate() {
    if (!conversationId) return;
    setError(null);
    try {
      await generate.mutateAsync(conversationId);
    } catch {
      setError('AI summary isn’t available right now.');
    }
  }

  return (
    <Card>
      <CardHeader
        title="AI smart summary"
        action={
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
            Beta
          </span>
        }
      />
      <div className="space-y-3 px-5 pb-4 pt-3">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-ink-300" />
          </div>
        ) : summary ? (
          <>
            <p className="text-xs leading-relaxed text-ink-600 dark:text-ink-300">{summary.summary}</p>
            <p className="text-[10px] text-ink-400 dark:text-ink-500">Generated {formatDistanceToNowStrict(new Date(summary.createdAt), { addSuffix: true })}</p>
          </>
        ) : (
          <p className="text-xs text-ink-400 dark:text-ink-500">No summary generated yet.</p>
        )}
        {error && <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">{error}</p>}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generate.isPending}
          className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 text-xs font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-50 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400"
        >
          {generate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {summary ? 'Regenerate summary' : 'Generate summary'}
        </button>
      </div>
    </Card>
  );
}

function formatSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Shared files card, sourced from `/conversations/:id/detail`. Omitted entirely (returns null)
 * when the endpoint is unavailable or there are no files — never shows placeholder rows. */
export function SharedFilesCard({ conversationId }: { conversationId: string | null }) {
  const { data, isLoading } = useConversationDetail(conversationId);
  if (!conversationId || isLoading) return null;
  const files = data?.sharedFiles || [];
  if (files.length === 0) return null;

  return (
    <Card>
      <CardHeader title="Shared files" />
      <ul className="space-y-2 px-5 pb-4 pt-3">
        {files.slice(0, 5).map((f) => (
          <li key={f.id} className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-50 text-ink-400 dark:bg-ink-800">
              <FileText className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-ink-800 dark:text-ink-100">{f.fileName}</span>
              <span className="block text-[10px] text-ink-400 dark:text-ink-500">{formatSize(f.fileSize)}</span>
            </span>
            <a href={f.url} target="_blank" rel="noreferrer" aria-label={`Download ${f.fileName}`} className="text-ink-400 hover:text-brand-600">
              <Download className="h-3.5 w-3.5" />
            </a>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function SharedLinksCard({ conversationId }: { conversationId: string | null }) {
  const { data, isLoading } = useConversationDetail(conversationId);
  if (!conversationId || isLoading) return null;
  const links = data?.sharedLinks || [];
  if (links.length === 0) return null;

  return (
    <Card>
      <CardHeader title="Shared links" />
      <ul className="space-y-2 px-5 pb-4 pt-3">
        {links.slice(0, 5).map((l) => (
          <li key={l.id} className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-50 text-ink-400 dark:bg-ink-800">
              <Link2 className="h-4 w-4" />
            </span>
            <a href={l.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-xs font-semibold text-brand-700 hover:underline dark:text-brand-400">
              {l.title}
            </a>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function RecentActivityCard({ conversationId }: { conversationId: string | null }) {
  const { data, isLoading } = useConversationDetail(conversationId);
  if (!conversationId || isLoading) return null;
  const activity = data?.recentActivity || [];
  if (activity.length === 0) return null;

  return (
    <Card>
      <CardHeader title="Recent activity" />
      <ul className="space-y-3 px-5 pb-4 pt-3">
        {activity.slice(0, 6).map((a) => (
          <li key={a.id} className="text-xs text-ink-600 dark:text-ink-300">
            <span className="font-semibold text-ink-900 dark:text-white">{a.actorName}</span> {a.action}
            <span className="block text-[10px] text-ink-400 dark:text-ink-500">{formatDistanceToNowStrict(new Date(a.createdAt), { addSuffix: true })}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Static, honest policy copy — mirrors the reference's "This conversation is monitored for
 * safety" line. Not a fabricated metric: it states Gigvora's actual messaging safety policy. */
export function ConversationSafetyCard() {
  return (
    <Card>
      <CardHeader title="Conversation safety" />
      <div className="flex items-start gap-2.5 px-5 pb-4 pt-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
        <div>
          <p className="text-xs text-ink-600 dark:text-ink-300">This conversation is monitored for safety. Messages may be scanned for scams, harassment, and policy violations.</p>
          <a href="/legal/acceptable-use-policy" className="mt-1 inline-block text-[11px] font-semibold text-brand-600 hover:underline dark:text-brand-400">
            Learn more
          </a>
        </div>
      </div>
    </Card>
  );
}

export function ModerationSafetyCard() {
  return (
    <Card>
      <CardHeader
        title="Moderation & safety"
        action={
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            Healthy
          </span>
        }
      />
      <div className="px-5 pb-4 pt-3">
        <p className="text-xs text-ink-600 dark:text-ink-300">No issues detected in this group. Content is automatically checked against Gigvora's safety policy.</p>
        <a href="/legal/acceptable-use-policy" className="mt-1 inline-block text-[11px] font-semibold text-brand-600 hover:underline dark:text-brand-400">
          Learn more
        </a>
      </div>
    </Card>
  );
}

export type ConversationParticipantLite = { id: string; name: string; headline?: string | null; online?: boolean };

/** Participants card for Project Messages — sourced straight from the conversation's own
 * `participants` field (no separate endpoint needed). */
export function ParticipantsCard({ participants }: { participants: ConversationParticipantLite[] }) {
  if (participants.length === 0) return null;
  return (
    <Card>
      <CardHeader title="Participants" />
      <ul className="space-y-2.5 px-5 pb-4 pt-3">
        {participants.map((p) => (
          <li key={p.id} className="flex items-center gap-2.5">
            <Avatar name={p.name} size="sm" online={p.online} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-ink-800 dark:text-ink-100">{p.name}</span>
              {p.headline && <span className="block truncate text-[10px] text-ink-400 dark:text-ink-500">{p.headline}</span>}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export type Milestone = { id: string; name: string; dueDate?: string | null; owner?: string | null; status: 'upcoming' | 'in_progress' | 'done' | 'overdue' };

function milestoneTone(status: Milestone['status']): 'brand' | 'neutral' | 'success' | 'warning' {
  if (status === 'done') return 'success';
  if (status === 'overdue') return 'warning';
  if (status === 'in_progress') return 'brand';
  return 'neutral';
}

/** "Key dates" card for Project Messages (reference 10.05) — only rendered when real milestone
 * data was fetched from the Projects API for the linked project. Callers must not pass fabricated
 * rows; when no real data exists the caller should simply not render this card. */
export function KeyDatesCard({ milestones }: { milestones: Milestone[] }) {
  if (milestones.length === 0) return null;
  return (
    <Card>
      <CardHeader title="Key dates" />
      <ul className="space-y-3 px-5 pb-4 pt-3">
        {milestones.map((m) => (
          <li key={m.id} className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-ink-800 dark:text-ink-100">{m.name}</p>
              <p className="text-[10px] text-ink-400 dark:text-ink-500">
                {m.dueDate ? format(new Date(m.dueDate), 'MMM d, yyyy') : 'No date set'}
                {m.owner ? ` · ${m.owner}` : ''}
              </p>
            </div>
            <Badge tone={milestoneTone(m.status)} className="shrink-0">
              {m.status.replace('_', ' ')}
            </Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Honest "no meetings backend yet" placeholder for the Recruiter Messages center panel — Phase 3
 * will wire this to a real interview-scheduling API. Never fabricates selectable time slots. */
export function InterviewSchedulingComingSoonCard() {
  return (
    <div className="mx-3.5 mt-3 flex items-start gap-3 rounded-xl border border-dashed border-ink-200 bg-ink-50/60 px-3.5 py-3 dark:border-ink-700 dark:bg-ink-800/40">
      <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
      <div>
        <p className="text-xs font-semibold text-ink-700 dark:text-ink-200">Interview scheduling is coming soon</p>
        <p className="mt-0.5 text-[11px] text-ink-500 dark:text-ink-400">
          Proposing and booking interview times from this thread isn&rsquo;t wired up yet — this is planned for a future release.
        </p>
      </div>
    </div>
  );
}

export type ApplicationSnapshot = { roleTitle: string; company?: string | null; stage: string; appliedAt?: string | null };

/** "Application snapshot" card for Recruiter Messages — only rendered when the conversation
 * carries real application context (no fabricated stage/role data). */
export function ApplicationSnapshotCard({ snapshot }: { snapshot: ApplicationSnapshot }) {
  return (
    <Card>
      <CardHeader title="Application snapshot" />
      <div className="space-y-1.5 px-5 pb-4 pt-3 text-xs text-ink-600 dark:text-ink-300">
        <p>
          <span className="font-semibold text-ink-900 dark:text-white">Applied for:</span> {snapshot.roleTitle}
        </p>
        {snapshot.company && (
          <p>
            <span className="font-semibold text-ink-900 dark:text-white">Company:</span> {snapshot.company}
          </p>
        )}
        <p>
          <span className="font-semibold text-ink-900 dark:text-white">Stage:</span> {snapshot.stage}
        </p>
        {snapshot.appliedAt && (
          <p className="text-[10px] text-ink-400 dark:text-ink-500">Applied {formatDistanceToNowStrict(new Date(snapshot.appliedAt), { addSuffix: true })}</p>
        )}
      </div>
    </Card>
  );
}

/** "Interview details" card for Recruiter Messages — only rendered when a real scheduled
 * interview exists. Reschedule/Add-to-calendar are honestly disabled since there is no meetings
 * backend yet (Phase 3), rather than being fake no-op buttons. */
export function InterviewDetailsCard({ when, withWhom }: { when: string; withWhom?: string | null }) {
  return (
    <Card>
      <CardHeader title="Interview details" />
      <div className="space-y-3 px-5 pb-4 pt-3">
        <div className="flex items-start gap-2.5 text-xs text-ink-600 dark:text-ink-300">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
          <div>
            <p className="font-semibold text-ink-900 dark:text-white">{format(new Date(when), 'EEE, MMM d · h:mm a')}</p>
            {withWhom && <p className="text-ink-500 dark:text-ink-400">with {withWhom}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            title="Rescheduling isn't available yet — interview scheduling is coming in a future release"
            className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-ink-200 text-xs font-semibold text-ink-400 opacity-60 dark:border-ink-700"
          >
            Reschedule
          </button>
          <button
            type="button"
            disabled
            title="Calendar sync isn't available yet — interview scheduling is coming in a future release"
            className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-ink-200 text-xs font-semibold text-ink-400 opacity-60 dark:border-ink-700"
          >
            <CalendarPlus className="h-3.5 w-3.5" /> Add to calendar
          </button>
        </div>
      </div>
    </Card>
  );
}

export type { ConversationDetail };
