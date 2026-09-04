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
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useCrmContact, useUpdateCrmContact } from '@/hooks/crm/useCrmContacts';
import { useCrmAccount } from '@/hooks/crm/useCrmAccounts';
import { useCrmActivities, useCreateCrmActivity } from '@/hooks/crm/useCrmActivities';
import { useCrmFollowups, useCreateCrmFollowup } from '@/hooks/crm/useCrmFollowups';
import type { CrmActivityType, CrmContact, CrmContactLifecycleStage, CrmObjectType } from '@/hooks/crm/types';
import { getApiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';

type TabKey = 'overview' | 'activity' | 'followups';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'activity', label: 'Activity' },
  { key: 'followups', label: 'Follow-ups' },
];

const LIFECYCLE_LABEL: Record<CrmContactLifecycleStage, string> = {
  lead: 'Lead',
  contact: 'Contact',
  customer: 'Customer',
};

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
function ActivityTab({
  objectType,
  objectId,
  composerRef,
}: {
  objectType: CrmObjectType;
  objectId: string;
  composerRef?: React.Ref<HTMLTextAreaElement>;
}) {
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

function EditableRelationshipCard({ contact }: { contact: CrmContact }) {
  const [editing, setEditing] = useState(false);
  const updateContact = useUpdateCrmContact();
  const [form, setForm] = useState({
    ownerUserId: contact.owner_user_id || '',
    tags: contact.tags.join(', '),
    relationshipType: contact.relationship_type || '',
    lifecycleStage: contact.lifecycle_stage,
    nextFollowupAt: contact.next_followup_at ? contact.next_followup_at.slice(0, 10) : '',
  });

  function startEdit() {
    setForm({
      ownerUserId: contact.owner_user_id || '',
      tags: contact.tags.join(', '),
      relationshipType: contact.relationship_type || '',
      lifecycleStage: contact.lifecycle_stage,
      nextFollowupAt: contact.next_followup_at ? contact.next_followup_at.slice(0, 10) : '',
    });
    setEditing(true);
  }

  function save() {
    updateContact.mutate(
      {
        id: contact.id,
        ownerUserId: form.ownerUserId || undefined,
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        relationshipType: form.relationshipType || undefined,
        lifecycleStage: form.lifecycleStage,
        nextFollowupAt: form.nextFollowupAt ? new Date(form.nextFollowupAt).toISOString() : undefined,
      },
      { onSuccess: () => setEditing(false) }
    );
  }

  return (
    <Card>
      <CardHeader
        title="Relationship"
        action={
          editing ? (
            <div className="flex items-center gap-1">
              <button type="button" onClick={save} disabled={updateContact.isPending} className="rounded-full p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10" aria-label="Save">
                <Check className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setEditing(false)} className="rounded-full p-1.5 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800" aria-label="Cancel">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={startEdit} className="rounded-full p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-ink-100" aria-label="Edit relationship">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )
        }
      />
      <div className="px-5 pb-4 pt-2">
        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-400 dark:text-ink-500">Owner user ID</label>
              <Input value={form.ownerUserId} onChange={(e) => setForm((f) => ({ ...f, ownerUserId: e.target.value }))} placeholder="Owner user ID" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-400 dark:text-ink-500">Relationship type</label>
              <Input value={form.relationshipType} onChange={(e) => setForm((f) => ({ ...f, relationshipType: e.target.value }))} placeholder="e.g. champion" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-400 dark:text-ink-500">Lifecycle stage</label>
              <select
                value={form.lifecycleStage}
                onChange={(e) => setForm((f) => ({ ...f, lifecycleStage: e.target.value as CrmContactLifecycleStage }))}
                className="h-10 w-full rounded-control border border-ink-200 bg-white px-3 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
              >
                <option value="lead">Lead</option>
                <option value="contact">Contact</option>
                <option value="customer">Customer</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-400 dark:text-ink-500">Tags (comma separated)</label>
              <Input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="vip, partner" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-400 dark:text-ink-500">Next follow-up</label>
              <Input type="date" value={form.nextFollowupAt} onChange={(e) => setForm((f) => ({ ...f, nextFollowupAt: e.target.value }))} />
            </div>
          </div>
        ) : (
          <>
            <InfoRow label="Relationship type" value={contact.relationship_type} />
            <InfoRow label="Owner" value={contact.owner_user_id} />
            <InfoRow label="Source" value={contact.source} />
            <InfoRow label="Lifecycle stage" value={LIFECYCLE_LABEL[contact.lifecycle_stage]} />
            <InfoRow label="First interaction" value={contact.first_interaction_at ? format(new Date(contact.first_interaction_at), 'MMM d, yyyy') : null} />
            <InfoRow label="Last interaction" value={contact.last_interaction_at ? format(new Date(contact.last_interaction_at), 'MMM d, yyyy') : null} />
            <InfoRow label="Interactions" value={contact.interaction_count} />
            <InfoRow label="Consent" value={contact.consent_status} />
          </>
        )}
      </div>
    </Card>
  );
}

function AddFollowupModal({ open, onClose, objectId }: { open: boolean; onClose: () => void; objectId: string }) {
  const createFollowup = useCreateCrmFollowup();
  const [type, setType] = useState('call');
  const [dueAt, setDueAt] = useState('');
  const [reason, setReason] = useState('');

  function submit() {
    if (!dueAt) return;
    createFollowup.mutate(
      { objectType: 'contact', objectId, type: type as any, dueAt: new Date(dueAt).toISOString(), reason: reason || undefined },
      {
        onSuccess: () => {
          setType('call');
          setDueAt('');
          setReason('');
          onClose();
        },
      }
    );
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="add-followup-title" className="max-w-md">
      <ModalHeader title="Add follow-up" onClose={onClose} />
      <div className="space-y-3 px-5 py-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-400 dark:text-ink-500">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="h-10 w-full rounded-control border border-ink-200 bg-white px-3 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
          >
            <option value="call">Call</option>
            <option value="email">Email</option>
            <option value="message">Message</option>
            <option value="meeting">Meeting</option>
            <option value="check_in">Check-in</option>
            <option value="relationship_touch">Relationship touch</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-400 dark:text-ink-500">Due</label>
          <Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} data-autofocus />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-400 dark:text-ink-500">Reason (optional)</label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What's this follow-up for?" />
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-ink-100 px-5 py-4 dark:border-ink-800">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} loading={createFollowup.isPending} disabled={!dueAt}>Add follow-up</Button>
      </div>
    </Modal>
  );
}

function FollowupsTab({ objectId }: { objectId: string }) {
  const { data, isLoading } = useCrmFollowups({ objectType: 'contact', objectId });
  const [modalOpen, setModalOpen] = useState(false);
  const followups = data?.data || [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setModalOpen(true)}>Add follow-up</Button>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
        </div>
      ) : followups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-200 bg-white py-14 text-center dark:border-ink-700 dark:bg-ink-900">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No follow-ups scheduled</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">Add a follow-up to stay on top of this relationship.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {followups.map((f) => (
            <Card key={f.id} className="flex items-center justify-between p-3.5">
              <div className="min-w-0">
                <p className="text-sm font-semibold capitalize text-ink-900 dark:text-white">{f.type.replace('_', ' ')}</p>
                <p className="mt-0.5 text-xs text-ink-400 dark:text-ink-500">Due {format(new Date(f.due_at), 'MMM d, yyyy')}</p>
                {f.reason && <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{f.reason}</p>}
              </div>
              <Badge tone={f.status === 'done' ? 'success' : f.status === 'snoozed' ? 'neutral' : 'brand'}>{f.status}</Badge>
            </Card>
          ))}
        </div>
      )}
      <AddFollowupModal open={modalOpen} onClose={() => setModalOpen(false)} objectId={objectId} />
    </div>
  );
}

function AccountRailCard({ accountId }: { accountId: string }) {
  const { data: account, isLoading } = useCrmAccount(accountId);

  if (isLoading) {
    return (
      <Card className="flex justify-center p-6">
        <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
      </Card>
    );
  }

  if (!account) return null;

  return (
    <Card>
      <CardHeader title="Account" />
      <div className="px-5 pb-4 pt-2">
        <p className="text-sm font-semibold text-ink-900 dark:text-white">{account.name}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge tone="neutral">{account.account_tier}</Badge>
          {account.relationship_health_score != null && <ScoreBadge score={account.relationship_health_score} />}
        </div>
        <Link
          href={`/app/crm-account-detail?id=${account.id}`}
          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-400"
        >
          View account <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </Card>
  );
}

function ContactDetailInner() {
  const id = useSearchParams().get('id') || undefined;
  const { data: contact, isLoading, isError, error } = useCrmContact(id);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  function focusComposer() {
    setActiveTab('activity');
    requestAnimationFrame(() => composerRef.current?.focus());
  }

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
        title={isForbidden ? "You don't have access to this contact" : isNotFound ? 'Contact not found' : isTransient ? 'Something went wrong loading this contact' : "Couldn't load this contact"}
        description={isTransient ? 'This is likely temporary — please try again in a moment.' : getApiErrorMessage(error, "This contact doesn't exist or you don't have access to it.")}
      />
    );
  }

  if (!contact) return null;

  const emailValue = contact.emails_jsonb?.[0]?.value || contact.email_normalized;
  const phoneValue = contact.phones_jsonb?.[0]?.value || contact.phone_normalized;
  const band = contact.relationship_health_score != null ? scoreBand(contact.relationship_health_score) : null;

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-5 lg:px-6">
      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Avatar name={contact.display_name || 'Unknown'} src={contact.avatar_url} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold text-ink-900 dark:text-white">{contact.display_name || 'Unnamed contact'}</h1>
                <Badge tone="neutral">{LIFECYCLE_LABEL[contact.lifecycle_stage]}</Badge>
                {band && <Badge tone={band.tone}>{band.label} relationship</Badge>}
              </div>
              {contact.job_title && <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{contact.job_title}</p>}
              {contact.location_text && <p className="mt-0.5 text-xs text-ink-400 dark:text-ink-500">{contact.location_text}</p>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="outline" size="sm" onClick={focusComposer}>Add note</Button>
          </div>
        </div>
      </Card>

      <Tabs tabs={TABS} value={activeTab} onChange={(k) => setActiveTab(k as TabKey)} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {activeTab === 'overview' && (
            <div role="tabpanel" id="tabpanel-overview" aria-labelledby="tab-overview" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader title="Contact info" />
                <div className="px-5 pb-4 pt-2">
                  <InfoRow label="Email" value={emailValue} />
                  <InfoRow label="Phone" value={phoneValue} />
                  <InfoRow label="Location" value={contact.location_text} />
                  <InfoRow label="Timezone" value={contact.timezone} />
                  <InfoRow label="Preferred channel" value={contact.preferred_channel} />
                </div>
              </Card>
              <Card>
                <CardHeader title="Professional" />
                <div className="px-5 pb-4 pt-2">
                  <InfoRow label="Job title" value={contact.job_title} />
                  <InfoRow label="Department" value={contact.department} />
                  <InfoRow label="Seniority" value={contact.seniority} />
                </div>
              </Card>
              <EditableRelationshipCard contact={contact} />
              <Card>
                <CardHeader title="Tags" />
                <div className="px-5 pb-4 pt-2">
                  {contact.tags.length === 0 ? (
                    <p className="text-sm text-ink-400 dark:text-ink-500">No tags yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {contact.tags.map((tag) => (
                        <Badge key={tag} tone="brand">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'activity' && (
            <div role="tabpanel" id="tabpanel-activity" aria-labelledby="tab-activity">
              <ActivityTab objectType="contact" objectId={contact.id} composerRef={composerRef} />
            </div>
          )}

          {activeTab === 'followups' && (
            <div role="tabpanel" id="tabpanel-followups" aria-labelledby="tab-followups">
              <FollowupsTab objectId={contact.id} />
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Relationship Intelligence" />
            <div className="space-y-3 px-5 pb-4 pt-2">
              <BigScore score={contact.relationship_health_score} label="Relationship health" />
              <InfoRow label="Engagement score" value={<ScoreBadge score={contact.engagement_score} />} />
              <InfoRow label="Interactions" value={contact.interaction_count} />
              <InfoRow label="Last interaction" value={contact.last_interaction_at ? formatDistanceToNow(new Date(contact.last_interaction_at), { addSuffix: true }) : null} />
            </div>
          </Card>
          {contact.account_id && <AccountRailCard accountId={contact.account_id} />}
        </div>
      </div>
    </div>
  );
}

export default function CrmContactDetailPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <ContactDetailInner />
    </Suspense>
  );
}
