'use client';

import { Suspense, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Activity,
  ArrowUpRight,
  Bell,
  Briefcase,
  Check,
  FileText,
  Loader2,
  Mail,
  MessageSquare,
  Pencil,
  Phone,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  StickyNote,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Tabs } from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { useCrmOpportunity, useUpdateCrmOpportunity, useMoveCrmOpportunity, useCloseCrmOpportunity } from '@/hooks/crm/useCrmOpportunities';
import { useCrmPipelineStages } from '@/hooks/crm/useCrmPipelineStages';
import { useCrmActivities, useCreateCrmActivity } from '@/hooks/crm/useCrmActivities';
import type { CrmActivityType, CrmObjectType } from '@/hooks/crm/types';
import { getApiErrorMessage } from '@/lib/api';

type TabKey = 'overview' | 'contacts' | 'activity' | 'stage-history';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'activity', label: 'Activity' },
  { key: 'stage-history', label: 'Stage history' },
];

function currency(value: number, code: string) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: code }).format(value);
}

function scoreBand(score: number): { tone: 'success' | 'warning' | 'danger'; label: string } {
  if (score >= 70) return { tone: 'success', label: 'Strong' };
  if (score >= 40) return { tone: 'warning', label: 'Moderate' };
  return { tone: 'danger', label: 'Weak' };
}

function BigScore({ score, label }: { score: number | null; label: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">{label}</p>
      {score == null ? (
        <p className="mt-1 text-2xl font-bold text-ink-300 dark:text-ink-600">—</p>
      ) : (
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-ink-900 dark:text-white">{score}</span>
          <Badge tone={scoreBand(score).tone}>{scoreBand(score).label}</Badge>
        </div>
      )}
    </div>
  );
}

const ACTIVITY_ICON: Partial<Record<CrmActivityType, typeof Activity>> = {
  note: StickyNote,
  email: Mail,
  message: MessageSquare,
  call: Phone,
  meeting: Users,
  file: FileText,
  stage_change: RefreshCw,
  owner_change: UserCog,
  enrichment: Sparkles,
  followup: Bell,
};

const ACTIVITY_TYPE_LABEL: Record<CrmActivityType, string> = {
  note: 'Note',
  email: 'Email',
  message: 'Message',
  call: 'Call',
  meeting: 'Meeting',
  file: 'File',
  stage_change: 'Stage change',
  owner_change: 'Owner change',
  enrichment: 'Enrichment',
  followup: 'Follow-up',
  system_event: 'System event',
};

function ActivityTab({ objectType, objectId, composerRef }: { objectType: CrmObjectType; objectId: string; composerRef?: React.Ref<HTMLTextAreaElement> }) {
  const { data, isLoading } = useCrmActivities({ objectType, objectId });
  const createActivity = useCreateCrmActivity();
  const [note, setNote] = useState('');
  const activities = data?.data || [];

  function handleAddNote() {
    if (!note.trim()) return;
    createActivity.mutate({ objectType, objectId, activityType: 'note', summary: note.trim() }, { onSuccess: () => setNote('') });
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <textarea
          ref={composerRef}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Log a call, note, or meeting..."
          rows={3}
          className="w-full resize-none rounded-control border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white dark:placeholder:text-ink-500"
        />
        <div className="mt-2 flex justify-end">
          <Button size="sm" onClick={handleAddNote} loading={createActivity.isPending} disabled={!note.trim()}>
            Add note
          </Button>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
        </div>
      ) : activities.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-200 bg-white py-14 text-center dark:border-ink-700 dark:bg-ink-900">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No activity yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">Log a call, note, or meeting to start building this deal&rsquo;s history.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map((activity) => {
            const Icon = ACTIVITY_ICON[activity.activity_type] || Activity;
            return (
              <Card key={activity.id} className="flex items-start gap-3 p-3.5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink-900 dark:text-white">{activity.subject || ACTIVITY_TYPE_LABEL[activity.activity_type]}</p>
                  {activity.summary && <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">{activity.summary}</p>}
                  <p className="mt-1 text-xs text-ink-400 dark:text-ink-500">{formatDistanceToNow(new Date(activity.occurred_at), { addSuffix: true })}</p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-xs font-medium text-ink-400 dark:text-ink-500">{label}</span>
      <span className="truncate text-right text-sm font-medium text-ink-800 dark:text-ink-200">{value ?? <span className="text-ink-300 dark:text-ink-600">—</span>}</span>
    </div>
  );
}

function EmptyState({ title, description, icon }: { title: string; description: string; icon?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-5 lg:px-6">
      <div className="rounded-2xl border border-dashed border-ink-200 bg-white py-16 text-center dark:border-ink-700 dark:bg-ink-900">
        <div className="mb-2 flex justify-center">{icon}</div>
        <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{description}</p>
      </div>
    </div>
  );
}

function ContactChip({ label, contact }: { label: string; contact: { id: string; display_name: string | null; job_title: string | null; avatar_url: string | null } | null }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">{label}</p>
      {contact ? (
        <Link href={`/app/crm-contact-detail?id=${contact.id}`} className="flex items-center gap-2 rounded-xl border border-ink-100 p-2 hover:border-brand-200 dark:border-ink-800 dark:hover:border-brand-500/40">
          <Avatar name={contact.display_name || 'Unknown'} src={contact.avatar_url} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{contact.display_name || 'Unnamed'}</p>
            {contact.job_title && <p className="truncate text-xs text-ink-400 dark:text-ink-500">{contact.job_title}</p>}
          </div>
        </Link>
      ) : (
        <p className="text-sm text-ink-300 dark:text-ink-600">Not identified</p>
      )}
    </div>
  );
}

function NextStepCard({ opportunityId, nextStep, nextStepDueAt }: { opportunityId: string; nextStep: string | null; nextStepDueAt: string | null }) {
  const [editing, setEditing] = useState(false);
  const updateOpp = useUpdateCrmOpportunity();
  const [form, setForm] = useState({ nextStep: nextStep || '', nextStepDueAt: nextStepDueAt ? nextStepDueAt.slice(0, 10) : '' });

  function save() {
    updateOpp.mutate(
      { id: opportunityId, nextStep: form.nextStep || undefined, nextStepDueAt: form.nextStepDueAt ? new Date(form.nextStepDueAt).toISOString() : undefined },
      { onSuccess: () => setEditing(false) }
    );
  }

  return (
    <Card>
      <CardHeader
        title="Next step"
        action={
          editing ? (
            <div className="flex items-center gap-1">
              <button type="button" onClick={save} disabled={updateOpp.isPending} className="rounded-full p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10" aria-label="Save">
                <Check className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setEditing(false)} className="rounded-full p-1.5 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800" aria-label="Cancel">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setEditing(true)} className="rounded-full p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-ink-100" aria-label="Edit next step">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )
        }
      />
      <div className="px-5 pb-4 pt-2">
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={form.nextStep}
              onChange={(e) => setForm((f) => ({ ...f, nextStep: e.target.value }))}
              rows={2}
              placeholder="What's next for this deal?"
              className="w-full resize-none rounded-control border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
            />
            <Input type="date" value={form.nextStepDueAt} onChange={(e) => setForm((f) => ({ ...f, nextStepDueAt: e.target.value }))} />
          </div>
        ) : nextStep ? (
          <>
            <p className="text-sm text-ink-700 dark:text-ink-200">{nextStep}</p>
            {nextStepDueAt && <p className="mt-1 text-xs text-ink-400 dark:text-ink-500">Due {format(new Date(nextStepDueAt), 'MMM d, yyyy')}</p>}
          </>
        ) : (
          <p className="text-sm text-ink-400 dark:text-ink-500">No next step set.</p>
        )}
      </div>
    </Card>
  );
}

function OpportunityDetailInner() {
  const id = useSearchParams().get('id') || undefined;
  const { data: opp, isLoading, isError, error } = useCrmOpportunity(id);
  const { data: stages } = useCrmPipelineStages();
  const moveOpp = useMoveCrmOpportunity();
  const closeOpp = useCloseCrmOpportunity();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [closeReason, setCloseReason] = useState('');
  const [closeModal, setCloseModal] = useState<'won' | 'lost' | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  function focusComposer() {
    setActiveTab('activity');
    requestAnimationFrame(() => composerRef.current?.focus());
  }

  if (!id) {
    return <EmptyState title="No record selected" description="Choose an opportunity from the collection or pipeline to continue." />;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (isError) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    const isForbidden = status === 403;
    const isNotFound = status === 404;
    const isTransient = status === 429 || (typeof status === 'number' && status >= 500);
    return (
      <EmptyState
        icon={isForbidden || isTransient ? <ShieldAlert className="h-6 w-6 text-amber-500" /> : undefined}
        title={isForbidden ? "You don't have access to this opportunity" : isNotFound ? 'Opportunity not found' : isTransient ? 'Something went wrong loading this opportunity' : "Couldn't load this opportunity"}
        description={isTransient ? 'This is likely temporary — please try again in a moment.' : getApiErrorMessage(error, "This opportunity doesn't exist or you don't have access to it.")}
      />
    );
  }

  if (!opp) return null;

  const currentStage = stages?.find((s) => s.id === opp.stage_id);
  const orderedStages = (stages || []).slice().sort((a, b) => a.order_index - b.order_index);
  const nextStage = orderedStages.find((s) => s.order_index === (currentStage?.order_index ?? -1) + 1);
  const isClosed = Boolean(opp.closed_at) || currentStage?.is_won || currentStage?.is_lost;

  function handleCloseSubmit() {
    if (!closeModal) return;
    closeOpp.mutate({ id: opp!.id, outcome: closeModal, reason: closeReason || undefined }, { onSuccess: () => { setCloseModal(null); setCloseReason(''); } });
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-5 lg:px-6">
      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              <Briefcase className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold text-ink-900 dark:text-white">{opp.name}</h1>
                {currentStage && (
                  <Badge tone={currentStage.is_won ? 'success' : currentStage.is_lost ? 'danger' : 'brand'}>{currentStage.label}</Badge>
                )}
              </div>
              <Link href={`/app/crm-account-detail?id=${opp.account_id}`} className="mt-1 inline-flex items-center gap-1 text-sm text-brand-700 hover:underline dark:text-brand-400">
                View account <ArrowUpRight className="h-3 w-3" />
              </Link>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                <span className="font-semibold text-ink-900 dark:text-white">{currency(opp.value, opp.currency)}</span>
                <span className="text-ink-400 dark:text-ink-500">·</span>
                <span className="text-ink-500 dark:text-ink-400">{opp.probability}% probability</span>
                <span className="text-ink-400 dark:text-ink-500">·</span>
                <span className="text-ink-500 dark:text-ink-400">Weighted {currency(opp.weighted_value, opp.currency)}</span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {!isClosed && nextStage && (
              <Button size="sm" loading={moveOpp.isPending} onClick={() => moveOpp.mutate({ id: opp.id, stageId: nextStage.id })}>
                Advance to {nextStage.label}
              </Button>
            )}
            {!isClosed && (
              <>
                <Button variant="outline" size="sm" onClick={() => setCloseModal('won')}>Mark won</Button>
                <Button variant="outline" size="sm" onClick={() => setCloseModal('lost')}>Mark lost</Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={focusComposer}>Add note</Button>
          </div>
        </div>
      </Card>

      {closeModal && (
        <Card className="border-brand-200 p-4 dark:border-brand-500/40">
          <p className="text-sm font-semibold text-ink-900 dark:text-white">Mark opportunity as {closeModal}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Input value={closeReason} onChange={(e) => setCloseReason(e.target.value)} placeholder={closeModal === 'won' ? 'Win reason (optional)' : 'Loss reason (optional)'} className="max-w-sm" />
            <Button size="sm" loading={closeOpp.isPending} onClick={handleCloseSubmit}>Confirm</Button>
            <Button size="sm" variant="ghost" onClick={() => setCloseModal(null)}>Cancel</Button>
          </div>
        </Card>
      )}

      <Tabs tabs={TABS} value={activeTab} onChange={(k) => setActiveTab(k as TabKey)} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {activeTab === 'overview' && (
            <div role="tabpanel" id="tabpanel-overview" aria-labelledby="tab-overview" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader title="Commercial" />
                <div className="px-5 pb-4 pt-2">
                  <InfoRow label="Value" value={currency(opp.value, opp.currency)} />
                  <InfoRow label="Forecast category" value={opp.forecast_category.replace('_', ' ')} />
                  <InfoRow label="Expected close" value={opp.expected_close_date ? format(new Date(opp.expected_close_date), 'MMM d, yyyy') : null} />
                  <InfoRow label="Type" value={opp.opportunity_type} />
                  <InfoRow label="Source" value={opp.source} />
                  <InfoRow label="Product / service" value={opp.product_service} />
                  {isClosed && <InfoRow label={currentStage?.is_won ? 'Win reason' : 'Loss reason'} value={currentStage?.is_won ? opp.win_reason : opp.loss_reason} />}
                </div>
              </Card>
              <NextStepCard opportunityId={opp.id} nextStep={opp.next_step} nextStepDueAt={opp.next_step_due_at} />
            </div>
          )}

          {activeTab === 'contacts' && (
            <Card>
              <CardHeader title="Stakeholders" />
              <div className="grid grid-cols-1 gap-3 px-5 pb-5 pt-2 sm:grid-cols-2">
                <ContactChip label="Primary contact" contact={opp.primaryContact} />
                <ContactChip label="Champion" contact={opp.championContact} />
                <ContactChip label="Decision maker" contact={opp.decisionMakerContact} />
                <ContactChip label="Economic buyer" contact={opp.economicBuyerContact} />
              </div>
            </Card>
          )}

          {activeTab === 'activity' && (
            <div role="tabpanel" id="tabpanel-activity" aria-labelledby="tab-activity">
              <ActivityTab objectType="opportunity" objectId={opp.id} composerRef={composerRef} />
            </div>
          )}

          {activeTab === 'stage-history' && (
            <div className="space-y-2">
              {orderedStages.map((stage) => (
                <div key={stage.id} className={`flex items-center gap-3 rounded-xl border p-3 ${stage.id === opp.stage_id ? 'border-brand-300 bg-brand-50/50 dark:border-brand-500/40 dark:bg-brand-500/5' : 'border-ink-100 dark:border-ink-800'}`}>
                  <span className={`h-2 w-2 shrink-0 rounded-full ${stage.id === opp.stage_id ? 'bg-brand-500' : 'bg-ink-200 dark:bg-ink-700'}`} />
                  <span className="text-sm font-medium text-ink-700 dark:text-ink-200">{stage.label}</span>
                  {stage.id === opp.stage_id && <Badge tone="brand" className="ml-auto">Current</Badge>}
                </div>
              ))}
              <p className="pt-2 text-xs text-ink-400 dark:text-ink-500">Full change-by-change history is recorded server-side in crm_opportunity_stage_history and mirrored into the Activity tab as stage_change events.</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Opportunity Intelligence" />
            <div className="space-y-3 px-5 pb-4 pt-2">
              <BigScore score={opp.ai_close_score} label="AI close score" />
              {opp.ai_close_confidence != null && <InfoRow label="Confidence" value={`${opp.ai_close_confidence}%`} />}
              <BigScore score={opp.relationship_health_score} label="Relationship health" />
              <p className="text-xs text-ink-400 dark:text-ink-500">Heuristic model — a guide for prioritisation, not a guarantee. Stage and probability stay editable regardless of score.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function CrmOpportunityDetailPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <OpportunityDetailInner />
    </Suspense>
  );
}
