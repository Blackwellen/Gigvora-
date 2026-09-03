'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNowStrict } from 'date-fns';
import { ShieldCheck, ShieldAlert, Check, X, Clock, Loader2, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { useAiActions, useAiAction, useDecideAction, type AiAction, type AiActionStatus } from '@/hooks/useAiActions';
import { CopilotNavStrip } from '@/components/copilot/CopilotNavStrip';

type RiskLevel = 'low' | 'medium' | 'high';

function riskLevel(score: number): RiskLevel {
  if (score < 0.4) return 'low';
  if (score < 0.7) return 'medium';
  return 'high';
}

const RISK_TONE: Record<RiskLevel, 'success' | 'warning' | 'danger'> = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
};

const STATUS_TONE: Record<AiActionStatus, 'warning' | 'success' | 'danger' | 'brand'> = {
  pending: 'warning',
  approved: 'brand',
  executed: 'success',
  rejected: 'danger',
};

function isSameDay(iso: string, ref: Date) {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth() && d.getDate() === ref.getDate();
}

function actionItemLabel(action: AiAction) {
  const preview = action.payload?.draftBody?.slice(0, 60) ?? '';
  return `Draft reply: "${preview}${action.payload?.draftBody && action.payload.draftBody.length > 60 ? '…' : ''}"`;
}

export default function AiApprovalQueuePage() {
  const { data: actions, isLoading } = useAiActions();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = actions ?? [];

  useEffect(() => {
    if (!selectedId && rows.length > 0) setSelectedId(rows[0].id);
  }, [rows, selectedId]);

  const today = new Date();
  const kpis = useMemo(() => {
    const pending = rows.filter((a) => a.status === 'pending').length;
    const approvedToday = rows.filter((a) => (a.status === 'approved' || a.status === 'executed') && isSameDay(a.updatedAt, today)).length;
    const rejectedToday = rows.filter((a) => a.status === 'rejected' && isSameDay(a.updatedAt, today)).length;
    const highRisk = rows.filter((a) => a.riskScore >= 0.7).length;
    return { pending, approvedToday, rejectedToday, highRisk };
  }, [rows]);

  const selected = rows.find((a) => a.id === selectedId) ?? null;

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 lg:px-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-ink-900 dark:text-white">
          <ShieldCheck className="h-5 w-5 text-brand-600" /> AI Approval Queue
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Review and approve AI-generated actions before they are applied.</p>
      </div>

      <CopilotNavStrip current="ai-approval-queue" />

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile label="Pending review" value={kpis.pending} tone="warning" />
        <KpiTile label="Approved today" value={kpis.approvedToday} tone="success" />
        <KpiTile label="Rejected today" value={kpis.rejectedToday} tone="danger" />
        <KpiTile label="High risk" value={kpis.highRisk} tone="danger" />
      </div>
      <p className="mt-1.5 text-xs text-ink-400 dark:text-ink-500">
        There is no due-date/SLA concept on this backend yet, so those tiles are omitted rather than fabricated.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[380px_1fr]">
        <div className="min-w-0 rounded-panel border border-ink-100 bg-white shadow-surface dark:border-ink-800 dark:bg-ink-900">
          {isLoading && (
            <div className="flex justify-center py-14">
              <Loader2 className="h-5 w-5 animate-spin text-ink-300" />
            </div>
          )}
          {!isLoading && rows.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Nothing to review</p>
              <p className="mt-1 text-sm text-ink-400 dark:text-ink-500">AI-drafted replies awaiting approval will show up here.</p>
            </div>
          )}
          {!isLoading &&
            rows.map((a) => {
              const level = riskLevel(a.riskScore);
              const active = a.id === selectedId;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedId(a.id)}
                  className={cn(
                    'flex w-full flex-col gap-1.5 border-b border-ink-50 px-4 py-3 text-left dark:border-ink-800/60',
                    active ? 'bg-brand-50/60 dark:bg-brand-500/5' : 'hover:bg-ink-50/60 dark:hover:bg-ink-800/40'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-ink-900 dark:text-white">{actionItemLabel(a)}</span>
                    <Badge tone={RISK_TONE[level]} className="shrink-0 capitalize">
                      {level}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-ink-400 dark:text-ink-500">
                    <span>Owner: You</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {formatDistanceToNowStrict(new Date(a.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <Badge tone={STATUS_TONE[a.status]} className="w-fit capitalize">
                    {a.status}
                  </Badge>
                </button>
              );
            })}
        </div>

        <div className="min-w-0 rounded-panel border border-ink-100 bg-white shadow-surface dark:border-ink-800 dark:bg-ink-900">
          {selected ? <ActionDetail actionId={selected.id} /> : (
            <div className="flex h-full items-center justify-center py-24 text-sm text-ink-400 dark:text-ink-500">Select an item to review</div>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiTile({ label, value, tone }: { label: string; value: number; tone: 'warning' | 'success' | 'danger' }) {
  const toneClasses = {
    warning: 'text-amber-600 dark:text-amber-400',
    success: 'text-emerald-600 dark:text-emerald-400',
    danger: 'text-red-600 dark:text-red-400',
  }[tone];
  return (
    <div className="rounded-panel border border-ink-100 bg-white p-3.5 shadow-surface dark:border-ink-800 dark:bg-ink-900">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">{label}</span>
      <p className={cn('mt-1.5 text-2xl font-bold', toneClasses)}>{value}</p>
    </div>
  );
}

type SubTab = 'preview' | 'explainability' | 'guardrails' | 'source' | 'audit';

const SUB_TABS: Array<{ key: SubTab; label: string }> = [
  { key: 'preview', label: 'Preview' },
  { key: 'explainability', label: 'Explainability' },
  { key: 'guardrails', label: 'Guardrails' },
  { key: 'source', label: 'Source context' },
  { key: 'audit', label: 'Audit trail' },
];

function ActionDetail({ actionId }: { actionId: string }) {
  const { data: action, isLoading } = useAiAction(actionId);
  const decide = useDecideAction();
  const [subTab, setSubTab] = useState<SubTab>('preview');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSubTab('preview');
    setError(null);
  }, [actionId]);

  if (isLoading || !action) {
    return (
      <div className="flex justify-center py-14">
        <Loader2 className="h-5 w-5 animate-spin text-ink-300" />
      </div>
    );
  }

  const level = riskLevel(action.riskScore);
  const isPending = action.status === 'pending';

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-ink-100 p-4 dark:border-ink-800 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-ink-900 dark:text-white">Draft reply for review</h2>
            <Badge tone={RISK_TONE[level]} className="capitalize">
              {level} risk
            </Badge>
          </div>
          <p className="mt-1 text-xs text-ink-400 dark:text-ink-500">
            Created {formatDistanceToNowStrict(new Date(action.createdAt), { addSuffix: true })}
          </p>
        </div>
        {isPending ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-500/40 dark:text-red-400"
              loading={decide.isPending && decide.variables?.decision === 'rejected'}
              disabled={decide.isPending}
              onClick={() => decide.mutate({ actionId: action.id, decision: 'rejected' }, { onError: () => setError('Could not reject — try again.') })}
            >
              <X className="h-4 w-4" /> Reject
            </Button>
            <Button
              loading={decide.isPending && decide.variables?.decision === 'approved'}
              disabled={decide.isPending}
              onClick={() => decide.mutate({ actionId: action.id, decision: 'approved' }, { onError: () => setError('Could not approve — try again.') })}
            >
              <Check className="h-4 w-4" /> Approve
            </Button>
          </div>
        ) : (
          <Badge tone={STATUS_TONE[action.status]} className="h-fit capitalize">
            {action.status}
          </Badge>
        )}
      </div>

      {error && (
        <div className="mx-4 mt-3 flex items-center justify-between rounded-panel border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {error}
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div role="tablist" className="flex flex-wrap items-center gap-1 border-b border-ink-100 px-2 dark:border-ink-800">
        {SUB_TABS.map((t) => {
          const active = t.key === subTab;
          return (
            <button
              key={t.key}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setSubTab(t.key)}
              className={cn(
                'relative px-3.5 py-2.5 text-sm font-semibold transition-colors',
                active ? 'text-brand-700 dark:text-brand-400' : 'text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-100'
              )}
            >
              {t.label}
              {active && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-600" />}
            </button>
          );
        })}
      </div>

      <div className="p-4">
        {subTab === 'preview' && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">AI-drafted reply</p>
            <div className="whitespace-pre-wrap rounded-panel border border-ink-100 bg-ink-50/50 p-4 text-sm text-ink-700 dark:border-ink-800 dark:bg-ink-800/40 dark:text-ink-200">
              {action.payload.draftBody}
            </div>
            <Link
              href={`/app/conversation?id=${action.targetId}`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              View conversation <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            {action.status === 'executed' && action.result?.messageId && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">Sent as message #{action.result.messageId.slice(0, 8)}</p>
            )}
          </div>
        )}

        {subTab === 'explainability' && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">AI confidence (inverse of risk)</p>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                  <div
                    className={cn('h-full rounded-full', level === 'high' ? 'bg-red-500' : level === 'medium' ? 'bg-amber-500' : 'bg-emerald-500')}
                    style={{ width: `${Math.round((1 - action.riskScore) * 100)}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-ink-900 dark:text-white">{Math.round((1 - action.riskScore) * 100)}%</span>
              </div>
              <p className="mt-1 text-xs text-ink-400 dark:text-ink-500">Risk score: {action.riskScore.toFixed(2)}</p>
            </div>
            {action.payload.safetyLabel && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Safety label</p>
                <Badge tone="neutral" className="mt-1.5 capitalize">
                  {action.payload.safetyLabel}
                </Badge>
              </div>
            )}
            {action.approvalRequirement && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Approval requirement</p>
                <p className="mt-1 text-sm text-ink-700 dark:text-ink-200">{action.approvalRequirement}</p>
              </div>
            )}
          </div>
        )}

        {subTab === 'guardrails' && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Flagged reason codes</p>
            {action.payload.reasonCodes?.length ? (
              <ul className="mt-2 space-y-2">
                {action.payload.reasonCodes.map((code) => (
                  <li key={code} className="flex items-center gap-2 rounded-panel border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
                    <ShieldAlert className="h-4 w-4 shrink-0" /> {code}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="h-4 w-4" /> No policy concerns flagged
              </p>
            )}
          </div>
        )}

        {subTab === 'source' && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Source conversation</p>
            <Link
              href={`/app/conversation?id=${action.targetId}`}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              Conversation {action.targetId.slice(0, 8)} <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        {subTab === 'audit' && (
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-ink-500 dark:text-ink-400">Created</dt>
              <dd className="font-medium text-ink-900 dark:text-white">{new Date(action.createdAt).toLocaleString()}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-ink-500 dark:text-ink-400">Last updated</dt>
              <dd className="font-medium text-ink-900 dark:text-white">{new Date(action.updatedAt).toLocaleString()}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-ink-500 dark:text-ink-400">Status</dt>
              <dd>
                <Badge tone={STATUS_TONE[action.status]} className="capitalize">
                  {action.status}
                </Badge>
              </dd>
            </div>
            {action.result?.messageId && (
              <div className="flex items-center justify-between">
                <dt className="text-ink-500 dark:text-ink-400">Result</dt>
                <dd className="font-medium text-ink-900 dark:text-white">Message #{action.result.messageId.slice(0, 8)} sent</dd>
              </div>
            )}
          </dl>
        )}
      </div>
    </div>
  );
}
