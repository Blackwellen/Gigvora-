'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertOctagon,
  CheckCircle2,
  ExternalLink,
  Info,
  Loader2,
  Lock,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import {
  useAiAuditEvent,
  useAiAuditEvents,
  useAiComplianceSummary,
  type AiAuditEvent,
  type AiAuditPolicyDecision,
} from '@/hooks/useAiAudit';
import { CopilotNavStrip } from '@/components/copilot/CopilotNavStrip';

const PAGE_SIZE = 15;

const EVENT_TYPES = [
  'copilot.generation.completed',
  'copilot.generation.failed',
  'message.safety_classification',
  'messaging.smart_replies',
  'messaging.conversation_summary',
  'action.created',
  'action.approved',
  'action.rejected',
];

const RISK_MIN_OPTIONS = [
  { label: 'Any risk', value: '' },
  { label: 'Risk ≥ 25%', value: '0.25' },
  { label: 'Risk ≥ 50%', value: '0.5' },
  { label: 'Risk ≥ 75%', value: '0.75' },
];

const POLICY_TONE: Record<AiAuditPolicyDecision, 'success' | 'warning' | 'danger'> = {
  allow: 'success',
  require_approval: 'warning',
  escalate: 'warning',
  block: 'danger',
};

const POLICY_LABEL: Record<AiAuditPolicyDecision, string> = {
  allow: 'Allowed',
  require_approval: 'Needs review',
  escalate: 'Escalated',
  block: 'Blocked',
};

const POLICY_EXPLAIN: Record<AiAuditPolicyDecision, string> = {
  allow: 'No policy concerns.',
  require_approval: 'Flagged for human review.',
  escalate: 'Flagged for human review.',
  block: 'Blocked by policy.',
};

export default function AiAuditPage() {
  const [eventType, setEventType] = useState('');
  const [riskMin, setRiskMin] = useState('');
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      eventType: eventType || undefined,
      riskMin: riskMin ? Number(riskMin) : undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }),
    [eventType, riskMin, page]
  );

  const { data, isLoading, isError } = useAiAuditEvents(filters);
  const { data: summary, isLoading: summaryLoading } = useAiComplianceSummary();
  const { data: selectedEvent } = useAiAuditEvent(selectedId);

  const events = data?.events ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function changeFilter(fn: () => void) {
    fn();
    setPage(0);
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-ink-900 dark:text-white">
          AI Audit
          <span title="Every AI governance event tied to your account — Copilot generations, message safety checks, and action approvals/rejections. There is no cross-user visibility yet: every row's actor is you.">
            <Info className="h-4.5 w-4.5 text-ink-300 dark:text-ink-600" />
          </span>
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">A verifiable, hash-chained log of AI governance events on your account.</p>
      </div>

      <CopilotNavStrip current="ai-audit" />

      {/* KPI strip */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiTile label="Total events" value={summaryLoading ? '—' : (summary?.totalEvents ?? 0).toLocaleString()} />
        <KpiTile label="High-risk" value={summaryLoading ? '—' : (summary?.highRiskEvents ?? 0).toLocaleString()} tone="warning" />
        <KpiTile label="Manual reviews" value={summaryLoading ? '—' : (summary?.manualReviewEvents ?? 0).toLocaleString()} tone="warning" />
        <KpiTile label="Blocked" value={summaryLoading ? '—' : (summary?.blockedEvents ?? 0).toLocaleString()} tone="danger" />
        <KpiTile label="Compliance score" value={summaryLoading ? '—' : `${Math.round(summary?.complianceScore ?? 0)}`} />
        <IntegrityTile summary={summary} loading={summaryLoading} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
        <div className="min-w-0 rounded-panel border border-ink-100 bg-white shadow-surface dark:border-ink-800 dark:bg-ink-900">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-ink-100 px-4 py-3 dark:border-ink-800">
            <select
              value={eventType}
              onChange={(e) => changeFilter(() => setEventType(e.target.value))}
              className="h-9 rounded-control border border-ink-200 bg-white px-2.5 text-sm text-ink-700 outline-none focus:border-brand-500 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
            >
              <option value="">All event types</option>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              value={riskMin}
              onChange={(e) => changeFilter(() => setRiskMin(e.target.value))}
              className="h-9 rounded-control border border-ink-200 bg-white px-2.5 text-sm text-ink-700 outline-none focus:border-brand-500 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
            >
              {RISK_MIN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="ml-auto text-xs text-ink-400 dark:text-ink-500" title="This endpoint doesn't support date filtering — results are paginated by recency.">
              Sorted by most recent
            </p>
          </div>

          {/* Bulk action bar — no bulk endpoint exists yet */}
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-2 dark:border-ink-800">
            <p className="text-xs font-medium text-ink-400 dark:text-ink-500">
              {isLoading ? 'Loading…' : `${total.toLocaleString()} event${total === 1 ? '' : 's'}`}
            </p>
            <Button size="sm" variant="outline" disabled title="Bulk export/approve/reject isn't available yet — there's no such endpoint for audit events yet.">
              Bulk actions (coming soon)
            </Button>
          </div>

          {isLoading && (
            <div className="flex justify-center py-14">
              <Loader2 className="h-5 w-5 animate-spin text-ink-300" />
            </div>
          )}

          {isError && !isLoading && (
            <p className="px-4 py-10 text-center text-sm text-red-600 dark:text-red-400">Couldn't load audit events. Try again shortly.</p>
          )}

          {!isLoading && !isError && events.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No events found</p>
              <p className="mt-1 text-sm text-ink-400 dark:text-ink-500">Try adjusting your filters.</p>
            </div>
          )}

          {!isLoading && events.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-ink-100 text-xs font-semibold uppercase tracking-wide text-ink-400 dark:border-ink-800 dark:text-ink-500">
                    <th className="px-4 py-2">Time</th>
                    <th className="px-2 py-2">Event</th>
                    <th className="px-2 py-2">Model</th>
                    <th className="px-2 py-2">Tools</th>
                    <th className="px-2 py-2">Grounded</th>
                    <th className="px-2 py-2">Risk</th>
                    <th className="px-2 py-2">Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev) => (
                    <EventRow key={ev.id} event={ev} selected={ev.id === selectedId} onSelect={() => setSelectedId(ev.id)} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && total > 0 && (
            <div className="flex items-center justify-between border-t border-ink-100 px-4 py-3 dark:border-ink-800">
              <p className="text-xs text-ink-400 dark:text-ink-500">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total.toLocaleString()} events
              </p>
              <div className="flex items-center gap-1">
                <PageButton onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} label="Previous page">
                  ‹
                </PageButton>
                <span className="px-2 text-xs font-semibold text-ink-500 dark:text-ink-400">
                  Page {page + 1} of {pageCount}
                </span>
                <PageButton onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={page + 1 >= pageCount} label="Next page">
                  ›
                </PageButton>
              </div>
            </div>
          )}
        </div>

        {/* Right detail panel */}
        <div className="flex flex-col gap-4">
          {selectedEvent ? (
            <DetailPanel event={selectedEvent} onClose={() => setSelectedId(null)} />
          ) : (
            <Card>
              <CardHeader title="Event details" />
              <p className="px-5 pb-4 pt-2 text-xs text-ink-400 dark:text-ink-500">Select a row in the table to view its full detail.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiTile({ label, value, tone }: { label: string; value: string; tone?: 'warning' | 'danger' }) {
  return (
    <div className="rounded-panel border border-ink-100 bg-white p-4 shadow-surface dark:border-ink-800 dark:bg-ink-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">{label}</p>
      <p
        className={cn(
          'mt-1.5 text-xl font-bold',
          tone === 'warning' && 'text-amber-600 dark:text-amber-400',
          tone === 'danger' && 'text-red-600 dark:text-red-400',
          !tone && 'text-ink-900 dark:text-white'
        )}
      >
        {value}
      </p>
    </div>
  );
}

function IntegrityTile({ summary, loading }: { summary: ReturnType<typeof useAiComplianceSummary>['data']; loading: boolean }) {
  const ok = summary?.chainIntegrity?.ok;
  return (
    <div
      className="rounded-panel border border-ink-100 bg-white p-4 shadow-surface dark:border-ink-800 dark:bg-ink-900"
      title="Each event is hash-chained to the previous one; tampering would break the chain."
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Log integrity</p>
      <p className="mt-1.5 flex items-center gap-1.5 text-base font-bold">
        {loading ? (
          <span className="text-ink-400">—</span>
        ) : ok ? (
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-4.5 w-4.5" /> Verified
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
            <ShieldAlert className="h-4.5 w-4.5" /> Broken
          </span>
        )}
      </p>
    </div>
  );
}

function EventRow({ event, selected, onSelect }: { event: AiAuditEvent; selected: boolean; onSelect: () => void }) {
  const grounded = groundedStateFor(event);
  return (
    <tr
      onClick={onSelect}
      className={cn(
        'cursor-pointer border-b border-ink-50 align-top last:border-b-0 hover:bg-ink-50/60 dark:border-ink-800/60 dark:hover:bg-ink-800/40',
        selected && 'bg-brand-50/60 dark:bg-brand-500/10'
      )}
    >
      <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-500 dark:text-ink-400">{new Date(event.createdAt).toLocaleString()}</td>
      <td className="px-2 py-3 text-sm font-semibold text-ink-800 dark:text-ink-100">{event.eventType}</td>
      <td className="px-2 py-3 text-sm text-ink-600 dark:text-ink-300">{event.model ?? '—'}</td>
      <td className="px-2 py-3 text-sm text-ink-600 dark:text-ink-300">{event.tools.length > 0 ? event.tools.join(', ') : '—'}</td>
      <td className="px-2 py-3">
        {grounded === null ? (
          <span className="text-xs text-ink-300 dark:text-ink-600">—</span>
        ) : grounded ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        ) : (
          <XCircle className="h-4 w-4 text-ink-300 dark:text-ink-600" />
        )}
      </td>
      <td className="px-2 py-3 text-sm text-ink-600 dark:text-ink-300">
        {event.riskScore == null ? '—' : `${Math.round(event.riskScore * 100)}%`}
      </td>
      <td className="px-2 py-3">
        <Badge tone={POLICY_TONE[event.policyDecision]}>{POLICY_LABEL[event.policyDecision] ?? event.policyDecision}</Badge>
      </td>
    </tr>
  );
}

function groundedStateFor(event: AiAuditEvent): boolean | null {
  if (event.eventType === 'copilot.generation.completed') {
    const state = (event.grounding as { groundingState?: string } | null)?.groundingState;
    if (state === 'grounded') return true;
    if (state === 'none') return false;
  }
  return null;
}

function PageButton({ children, onClick, disabled, label }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 w-8 items-center justify-center rounded-control text-sm font-semibold text-ink-500 hover:bg-ink-100 disabled:pointer-events-none disabled:opacity-30 dark:text-ink-400 dark:hover:bg-ink-800"
    >
      {children}
    </button>
  );
}

type DetailTab = 'preview' | 'source' | 'guardrails' | 'explainability' | 'audit';

const DETAIL_TABS: Array<{ key: DetailTab; label: string }> = [
  { key: 'preview', label: 'Preview' },
  { key: 'source', label: 'Source context' },
  { key: 'guardrails', label: 'Guardrails' },
  { key: 'explainability', label: 'Explainability' },
  { key: 'audit', label: 'Audit trail' },
];

function DetailPanel({ event, onClose }: { event: AiAuditEvent; onClose: () => void }) {
  const [tab, setTab] = useState<DetailTab>('preview');
  const isActionEvent = event.eventType.startsWith('action.');

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-4">
        <h3 className="font-display text-sm font-bold tracking-[-0.01em] text-ink-900 dark:text-white">{event.eventType}</h3>
        <button type="button" onClick={onClose} className="text-xs font-semibold text-ink-400 hover:text-ink-700 dark:text-ink-500 dark:hover:text-ink-200">
          Close
        </button>
      </div>
      <p className="px-5 pt-1 text-xs text-ink-400 dark:text-ink-500">{new Date(event.createdAt).toLocaleString()}</p>

      <div role="tablist" className="mt-3 flex flex-wrap gap-1 border-b border-ink-100 px-3 dark:border-ink-800">
        {DETAIL_TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'relative px-2.5 py-2 text-xs font-semibold transition-colors',
              tab === t.key ? 'text-brand-700 dark:text-brand-400' : 'text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-100'
            )}
          >
            {t.label}
            {tab === t.key && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-600" />}
          </button>
        ))}
      </div>

      <div className="max-h-[520px] overflow-y-auto p-5">
        {tab === 'preview' && <PreviewTab event={event} isActionEvent={isActionEvent} />}
        {tab === 'source' && <SourceContextTab event={event} />}
        {tab === 'guardrails' && <GuardrailsTab event={event} />}
        {tab === 'explainability' && <ExplainabilityTab event={event} />}
        {tab === 'audit' && <AuditTrailTab event={event} isActionEvent={isActionEvent} />}
      </div>
    </Card>
  );
}

function PreviewTab({ event, isActionEvent }: { event: AiAuditEvent; isActionEvent: boolean }) {
  return (
    <div className="space-y-3 text-sm">
      {isActionEvent && event.actionId && (
        <Link href="/app/ai-approval-queue" className="flex items-center gap-1.5 text-brand-700 hover:underline dark:text-brand-400">
          View full detail in the Approval Queue <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      )}
      {event.eventType === 'copilot.generation.completed' && event.threadId && (
        <Link href={`/app/copilot-workspace?threadId=${event.threadId}`} className="flex items-center gap-1.5 text-brand-700 hover:underline dark:text-brand-400">
          Open the Copilot conversation <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      )}
      {event.grounding && Object.keys(event.grounding).length > 0 ? (
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-ink-100 bg-ink-50 p-3 text-xs text-ink-700 dark:border-ink-800 dark:bg-ink-800/60 dark:text-ink-200">
          {JSON.stringify(event.grounding, null, 2)}
        </pre>
      ) : (
        <p className="text-xs text-ink-400 dark:text-ink-500">No grounding/payload detail recorded for this event type.</p>
      )}
    </div>
  );
}

function SourceContextTab({ event }: { event: AiAuditEvent }) {
  const links: Array<{ label: string; href: string }> = [];
  if (event.threadId) links.push({ label: 'Copilot thread', href: `/app/copilot-workspace?threadId=${event.threadId}` });
  if (event.actionId) links.push({ label: 'Action', href: '/app/ai-approval-queue' });

  return (
    <div className="space-y-2 text-sm">
      <Row label="Thread ID" value={event.threadId} />
      <Row label="Message ID" value={event.messageId} />
      <Row label="Action ID" value={event.actionId} />
      <Row label="Task ID" value={event.taskId} />
      {links.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5">
          {links.map((l) => (
            <Link key={l.href + l.label} href={l.href} className="flex items-center gap-1.5 text-brand-700 hover:underline dark:text-brand-400">
              {l.label} <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function GuardrailsTab({ event }: { event: AiAuditEvent }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge tone={POLICY_TONE[event.policyDecision]}>{POLICY_LABEL[event.policyDecision] ?? event.policyDecision}</Badge>
      </div>
      <p className="text-sm text-ink-600 dark:text-ink-300">{POLICY_EXPLAIN[event.policyDecision] ?? 'No further detail available.'}</p>
      {event.policyDecision === 'block' && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
          <AlertOctagon className="h-3.5 w-3.5" /> This event was blocked before completing.
        </div>
      )}
    </div>
  );
}

function ExplainabilityTab({ event }: { event: AiAuditEvent }) {
  if (event.riskScore == null) {
    return <p className="text-xs text-ink-400 dark:text-ink-500">No risk score was computed for this event type.</p>;
  }
  const pct = Math.round(event.riskScore * 100);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-ink-600 dark:text-ink-300">Risk score</span>
        <span className="font-bold text-ink-900 dark:text-white">{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
        <div
          className={cn('h-full rounded-full', pct >= 75 ? 'bg-red-500' : pct >= 40 ? 'bg-amber-500' : 'bg-emerald-500')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function AuditTrailTab({ event, isActionEvent }: { event: AiAuditEvent; isActionEvent: boolean }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-ink-100 p-3 dark:border-ink-800">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-700 dark:text-ink-200">
          <Lock className="h-3.5 w-3.5" /> Immutable log
        </p>
        <p className="mt-1.5 font-mono text-xs text-ink-500 dark:text-ink-400">{event.immutableHash.slice(0, 16)}...</p>
        <p className="mt-1 text-xs text-ink-400 dark:text-ink-500">{new Date(event.createdAt).toLocaleString()}</p>
        <p className="mt-2 text-xs text-ink-400 dark:text-ink-500">
          Each event is hash-chained to the previous one — tampering would break the chain. This is a verifiable hash chain, not a blockchain.
        </p>
      </div>

      {isActionEvent && (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-ink-700 dark:text-ink-200">Approval history</p>
          <ul className="space-y-1.5 text-xs text-ink-500 dark:text-ink-400">
            <li>Created — {new Date(event.createdAt).toLocaleString()}</li>
            <li>
              {event.eventType === 'action.approved' && 'Approved'}
              {event.eventType === 'action.rejected' && 'Rejected'}
              {event.eventType === 'action.created' && 'Awaiting decision'}
              {' — '}
              {new Date(event.createdAt).toLocaleString()}
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-ink-50 py-1.5 text-xs last:border-b-0 dark:border-ink-800/60">
      <span className="text-ink-400 dark:text-ink-500">{label}</span>
      <span className="max-w-[220px] truncate font-mono text-ink-700 dark:text-ink-200">{value ?? '—'}</span>
    </div>
  );
}
