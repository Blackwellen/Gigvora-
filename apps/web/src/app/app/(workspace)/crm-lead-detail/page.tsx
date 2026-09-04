'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import {
  Activity,
  Bell,
  FileText,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  StickyNote,
  UserCog,
  Users,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Tabs } from '@/components/ui/Tabs';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useCrmLead, useConvertCrmLead, useDisqualifyCrmLead } from '@/hooks/crm/useCrmLeads';
import { useCrmActivities, useCreateCrmActivity } from '@/hooks/crm/useCrmActivities';
import type { CrmActivityType, CrmObjectType } from '@/hooks/crm/types';
import { getApiErrorMessage } from '@/lib/api';

type TabKey = 'overview' | 'activity' | 'signals';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'activity', label: 'Activity' },
  { key: 'signals', label: 'Signals' },
];

// ---- shared score-band helpers (duplicated per detail page — no shared file across sessions) ----
function scoreBand(score: number): { tone: 'success' | 'warning' | 'danger'; label: string } {
  if (score >= 70) return { tone: 'success', label: 'Strong' };
  if (score >= 40) return { tone: 'warning', label: 'Moderate' };
  return { tone: 'danger', label: 'Weak' };
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="text-ink-300 dark:text-ink-600">—</span>;
  const band = scoreBand(score);
  return <Badge tone={band.tone}>{score}</Badge>;
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

/** Shared timeline + composer, duplicated into each of the 4 CRM detail pages. */
function ActivityTab({ objectType, objectId }: { objectType: CrmObjectType; objectId: string }) {
  const { data, isLoading } = useCrmActivities({ objectType, objectId });
  const createActivity = useCreateCrmActivity();
  const [note, setNote] = useState('');
  const activities = data?.data || [];

  function handleAddNote() {
    if (!note.trim()) return;
    createActivity.mutate(
      { objectType, objectId, activityType: 'note', summary: note.trim() },
      { onSuccess: () => setNote('') }
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <textarea
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
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">
            Log a call, note, or meeting to start building this record&rsquo;s history.
          </p>
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
                  <p className="text-sm font-semibold text-ink-900 dark:text-white">
                    {activity.subject || ACTIVITY_TYPE_LABEL[activity.activity_type]}
                  </p>
                  {activity.summary && <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">{activity.summary}</p>}
                  <p className="mt-1 text-xs text-ink-400 dark:text-ink-500">
                    {formatDistanceToNow(new Date(activity.occurred_at), { addSuffix: true })}
                  </p>
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

const TEMPERATURE_META: Record<string, { dot: string; label: string; text: string }> = {
  cold: { dot: 'bg-sky-400', label: 'Cold', text: 'text-sky-700 dark:text-sky-400' },
  warm: { dot: 'bg-amber-400', label: 'Warm', text: 'text-amber-700 dark:text-amber-400' },
  hot: { dot: 'bg-red-500', label: 'Hot', text: 'text-red-700 dark:text-red-400' },
};

const LEAD_STATUS_TONE: Record<string, 'brand' | 'neutral' | 'success' | 'warning' | 'danger'> = {
  new: 'neutral',
  working: 'brand',
  qualified: 'success',
  nurture: 'warning',
  converted: 'success',
  disqualified: 'danger',
};

function ConvertModal({ open, onClose, leadId }: { open: boolean; onClose: () => void; leadId: string }) {
  const router = useRouter();
  const convertLead = useConvertCrmLead();
  const [createOpportunity, setCreateOpportunity] = useState(true);
  const [opportunityName, setOpportunityName] = useState('');
  const [value, setValue] = useState('');

  async function submit() {
    try {
      const result = await convertLead.mutateAsync({
        id: leadId,
        createOpportunity,
        opportunityName: createOpportunity ? opportunityName || undefined : undefined,
        value: createOpportunity && value ? Number(value) : undefined,
      });
      if (result.opportunity) {
        router.push(`/app/crm-opportunity-detail?id=${result.opportunity.id}`);
      } else if (result.contact) {
        router.push(`/app/crm-contact-detail?id=${result.contact.id}`);
      } else {
        onClose();
      }
    } catch {
      // surfaced via convertLead.isError below
    }
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="convert-lead-title" className="max-w-md">
      <ModalHeader title="Convert lead" onClose={onClose} />
      <div className="space-y-3 px-5 py-4">
        <label className="flex items-center gap-2 text-sm font-medium text-ink-700 dark:text-ink-200">
          <input type="checkbox" checked={createOpportunity} onChange={(e) => setCreateOpportunity(e.target.checked)} className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500" />
          Create an opportunity
        </label>
        {createOpportunity && (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-400 dark:text-ink-500">Opportunity name</label>
              <Input value={opportunityName} onChange={(e) => setOpportunityName(e.target.value)} placeholder="e.g. Acme Corp — Growth plan" data-autofocus />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-400 dark:text-ink-500">Value</label>
              <Input type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" />
            </div>
          </>
        )}
        {convertLead.isError && <p className="text-sm text-red-600 dark:text-red-400">{getApiErrorMessage(convertLead.error)}</p>}
      </div>
      <div className="flex justify-end gap-2 border-t border-ink-100 px-5 py-4 dark:border-ink-800">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} loading={convertLead.isPending}>Convert</Button>
      </div>
    </Modal>
  );
}

function DisqualifyModal({ open, onClose, leadId }: { open: boolean; onClose: () => void; leadId: string }) {
  const disqualifyLead = useDisqualifyCrmLead();
  const [reason, setReason] = useState('');

  function submit() {
    disqualifyLead.mutate({ id: leadId, reason: reason || undefined }, { onSuccess: onClose });
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="disqualify-lead-title" className="max-w-sm">
      <ModalHeader title="Disqualify lead" onClose={onClose} />
      <div className="space-y-3 px-5 py-4">
        <label className="mb-1 block text-xs font-medium text-ink-400 dark:text-ink-500">Reason (optional)</label>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this lead disqualified?" data-autofocus />
      </div>
      <div className="flex justify-end gap-2 border-t border-ink-100 px-5 py-4 dark:border-ink-800">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={submit} loading={disqualifyLead.isPending}>Disqualify</Button>
      </div>
    </Modal>
  );
}

function LeadDetailInner() {
  const id = useSearchParams().get('id') || undefined;
  const { data: lead, isLoading, isError, error } = useCrmLead(id);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [convertOpen, setConvertOpen] = useState(false);
  const [disqualifyOpen, setDisqualifyOpen] = useState(false);

  if (!id) {
    return <EmptyState title="No record selected" description="Choose a record from the collection page to continue." />;
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
        title={isForbidden ? "You don't have access to this lead" : isNotFound ? 'Lead not found' : isTransient ? 'Something went wrong loading this lead' : "Couldn't load this lead"}
        description={isTransient ? 'This is likely temporary — please try again in a moment.' : getApiErrorMessage(error, "This lead doesn't exist or you don't have access to it.")}
      />
    );
  }

  if (!lead) return null;

  const temp = TEMPERATURE_META[lead.lead_temperature];
  const isFinal = lead.lead_status === 'converted' || lead.lead_status === 'disqualified';
  const fitCaption =
    lead.fit_score != null
      ? `${lead.fit_score >= 70 ? 'Strong' : lead.fit_score >= 40 ? 'Moderate' : 'Weak'} fit based on title seniority and source.`
      : 'Fit signal not yet available for this lead.';

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-5 lg:px-6">
      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Avatar name={lead.display_name || 'Unknown'} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold text-ink-900 dark:text-white">{lead.display_name || 'Unnamed lead'}</h1>
                <Badge tone={LEAD_STATUS_TONE[lead.lead_status] || 'neutral'}>{lead.lead_status}</Badge>
                {temp && (
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${temp.text}`}>
                    <span className={`h-2 w-2 rounded-full ${temp.dot}`} /> {temp.label}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
                {[lead.job_title, lead.company_name].filter(Boolean).join(' at ') || '—'}
              </p>
              {lead.location && <p className="mt-0.5 text-xs text-ink-400 dark:text-ink-500">{lead.location}</p>}
            </div>
          </div>
          {!isFinal && (
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="outline" className="border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10" onClick={() => setDisqualifyOpen(true)}>
                Disqualify
              </Button>
              <Button onClick={() => setConvertOpen(true)}>Convert</Button>
            </div>
          )}
        </div>
      </Card>

      <Tabs tabs={TABS} value={activeTab} onChange={(k) => setActiveTab(k as TabKey)} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {activeTab === 'overview' && (
            <div role="tabpanel" id="tabpanel-overview" aria-labelledby="tab-overview" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader title="Source" />
                <div className="px-5 pb-4 pt-2">
                  <InfoRow label="Lead source" value={lead.lead_source} />
                  <InfoRow label="UTM source" value={lead.utm_source} />
                  <InfoRow label="UTM medium" value={lead.utm_medium} />
                  <InfoRow label="UTM campaign" value={lead.utm_campaign} />
                  <InfoRow label="Referrer" value={lead.referrer} />
                </div>
              </Card>
              <Card>
                <CardHeader title="Qualification" />
                <div className="px-5 pb-4 pt-2">
                  <InfoRow label="Job title" value={lead.job_title} />
                  <InfoRow label="Company" value={lead.company_name} />
                  <InfoRow label="Location" value={lead.location} />
                  <InfoRow label="Buying role prediction" value={lead.buying_role_prediction} />
                  {lead.duplicate_risk_score != null && <InfoRow label="Duplicate risk" value={<ScoreBadge score={lead.duplicate_risk_score} />} />}
                </div>
              </Card>
              <Card className="sm:col-span-2">
                <CardHeader title="Scores" />
                <div className="grid grid-cols-2 gap-4 px-5 pb-5 pt-3 sm:grid-cols-4">
                  <BigScore score={lead.fit_score} label="Fit" />
                  <BigScore score={lead.intent_score} label="Intent" />
                  <BigScore score={lead.engagement_score} label="Engagement" />
                  <BigScore score={lead.qualification_score} label="Qualification" />
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'activity' && (
            <div role="tabpanel" id="tabpanel-activity" aria-labelledby="tab-activity">
              <ActivityTab objectType="lead" objectId={lead.id} />
            </div>
          )}

          {activeTab === 'signals' && (
            <div role="tabpanel" id="tabpanel-signals" aria-labelledby="tab-signals">
              <Card>
                <CardHeader title="Signals" />
                <div className="px-5 pb-4 pt-2">
                  <InfoRow label="Last activity" value={lead.last_activity_at ? formatDistanceToNow(new Date(lead.last_activity_at), { addSuffix: true }) : null} />
                  <InfoRow label="Next follow-up" value={lead.next_followup_at ? formatDistanceToNow(new Date(lead.next_followup_at), { addSuffix: true }) : null} />
                  <InfoRow label="Enrichment status" value={<Badge tone={lead.enrichment_status === 'completed' ? 'success' : lead.enrichment_status === 'failed' ? 'danger' : 'neutral'}>{lead.enrichment_status}</Badge>} />
                </div>
              </Card>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="AI Lead Analysis" className="bg-purple-50/60 dark:bg-purple-500/5" />
            <div className="space-y-3 px-5 pb-4 pt-2">
              <BigScore score={lead.fit_score} label="Fit" />
              <BigScore score={lead.intent_score} label="Intent" />
              <BigScore score={lead.engagement_score} label="Engagement" />
              <p className="rounded-lg bg-purple-50 px-3 py-2 text-xs text-purple-700 dark:bg-purple-500/15 dark:text-purple-400">{fitCaption}</p>
            </div>
          </Card>
          {!isFinal && (
            <Card className="p-4">
              <p className="text-sm font-semibold text-ink-900 dark:text-white">Ready to move forward?</p>
              <p className="mt-1 text-xs text-ink-400 dark:text-ink-500">Convert this lead into a contact and opportunity.</p>
              <Button className="mt-3 w-full" onClick={() => setConvertOpen(true)}>Convert</Button>
            </Card>
          )}
        </div>
      </div>

      <ConvertModal open={convertOpen} onClose={() => setConvertOpen(false)} leadId={lead.id} />
      <DisqualifyModal open={disqualifyOpen} onClose={() => setDisqualifyOpen(false)} leadId={lead.id} />
    </div>
  );
}

export default function CrmLeadDetailPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <LeadDetailInner />
    </Suspense>
  );
}
