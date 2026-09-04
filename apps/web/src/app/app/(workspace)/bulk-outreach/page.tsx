'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, Mail, Plus, Send, Trash2, Users } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { RecruiterSeatGate } from '@/components/recruiter/RecruiterSeatGate';
import { ProUpgradeBanner } from '@/components/recruiter-pro/ProUpgradeBanner';
import { useRecruiterSeat } from '@/hooks/recruiter/useRecruiterSeat';
import { useBulkOutreachCampaigns, useCreateBulkOutreachCampaign, useSendBulkOutreachCampaign, type CreateCampaignBody } from '@/hooks/recruiter-pro/useBulkOutreach';
import type { BulkOutreachCampaign, BulkOutreachVariant, OutreachChannel } from '@/hooks/recruiter-pro/types';
import { getApiErrorMessage } from '@/lib/api';

const STATUS_TONE: Record<BulkOutreachCampaign['status'], 'neutral' | 'brand' | 'success' | 'warning'> = {
  draft: 'neutral',
  scheduled: 'brand',
  sending: 'warning',
  sent: 'success',
  paused: 'neutral',
};

const STEPS = ['Audience', 'Template & A/B', 'Review & schedule'] as const;

function emptyVariant(label: string): BulkOutreachVariant {
  return { id: crypto.randomUUID(), label, template_id: null, subject: '', body: '', split_pct: 100 };
}

function ComposerWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [channel, setChannel] = useState<OutreachChannel>('email');
  const [audienceCount, setAudienceCount] = useState('50');
  const [variants, setVariants] = useState<BulkOutreachVariant[]>([emptyVariant('Variant A')]);
  const [scheduledAt, setScheduledAt] = useState('');

  const create = useCreateBulkOutreachCampaign();

  function reset() {
    setStep(0);
    setName('');
    setChannel('email');
    setAudienceCount('50');
    setVariants([emptyVariant('Variant A')]);
    setScheduledAt('');
  }

  function close() {
    reset();
    onClose();
  }

  function addVariant() {
    const label = `Variant ${String.fromCharCode(65 + variants.length)}`;
    const evenSplit = Math.floor(100 / (variants.length + 1));
    setVariants((prev) => [...prev.map((v) => ({ ...v, split_pct: evenSplit })), { ...emptyVariant(label), split_pct: 100 - evenSplit * variants.length }]);
  }

  function removeVariant(id: string) {
    setVariants((prev) => (prev.length > 1 ? prev.filter((v) => v.id !== id) : prev));
  }

  function updateVariant(id: string, patch: Partial<BulkOutreachVariant>) {
    setVariants((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }

  function submit() {
    const body: CreateCampaignBody = {
      name: name.trim(),
      channel,
      audience_count: Number(audienceCount) || 0,
      variants: variants.map(({ label, template_id, subject, body: b, split_pct }) => ({ label, template_id, subject, body: b, split_pct })),
      scheduled_at: scheduledAt || null,
    };
    create.mutate(body, { onSuccess: close });
  }

  const canProceed = step === 0 ? name.trim().length > 0 : step === 1 ? variants.every((v) => v.subject.trim() || v.body.trim()) : true;

  return (
    <Modal open={open} onClose={close} className="max-w-xl" labelledBy="composer-title">
      <ModalHeader title="New outreach campaign" onClose={close} />
      <div className="px-5 pt-4">
        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center gap-2">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  i <= step ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-400 dark:bg-ink-800'
                }`}
              >
                {i + 1}
              </span>
              <span className={`text-xs font-semibold ${i <= step ? 'text-ink-800 dark:text-ink-100' : 'text-ink-400 dark:text-ink-500'}`}>{label}</span>
              {i < STEPS.length - 1 && <div className="h-px flex-1 bg-ink-100 dark:bg-ink-800" />}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 px-5 py-5">
        {step === 0 && (
          <>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-600 dark:text-ink-300">Campaign name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Q3 senior engineers" data-autofocus />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-600 dark:text-ink-300">Channel</label>
              <div className="flex gap-2">
                {(['email', 'linkedin'] as OutreachChannel[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setChannel(c)}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold capitalize ${
                      channel === c ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15' : 'border-ink-200 text-ink-600 dark:border-ink-700 dark:text-ink-300'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-600 dark:text-ink-300">Audience size</label>
              <Input type="number" min={1} value={audienceCount} onChange={(e) => setAudienceCount(e.target.value)} />
            </div>
          </>
        )}

        {step === 1 && (
          <div className="space-y-3">
            {variants.map((v) => (
              <div key={v.id} className="rounded-xl border border-ink-100 p-3 dark:border-ink-800">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-bold text-ink-700 dark:text-ink-200">{v.label} — {v.split_pct}% split</p>
                  {variants.length > 1 && (
                    <button type="button" onClick={() => removeVariant(v.id)} aria-label={`Remove ${v.label}`} className="text-ink-400 hover:text-red-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {channel === 'email' && (
                  <Input value={v.subject} onChange={(e) => updateVariant(v.id, { subject: e.target.value })} placeholder="Subject line" className="mb-2" />
                )}
                <textarea
                  value={v.body}
                  onChange={(e) => updateVariant(v.id, { body: e.target.value })}
                  placeholder="Message body…"
                  rows={3}
                  className="w-full rounded-control border border-ink-200 bg-white p-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
                />
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addVariant} disabled={variants.length >= 4}>
              <Plus className="h-3.5 w-3.5" /> Add A/B variant
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-600 dark:text-ink-300">Schedule (leave blank to send immediately)</label>
              <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </div>
            <div className="rounded-xl border border-ink-100 p-3 text-sm dark:border-ink-800">
              <p className="font-semibold text-ink-800 dark:text-ink-100">{name}</p>
              <p className="mt-1 text-xs text-ink-500 dark:text-ink-400 capitalize">{channel} · {audienceCount} recipients · {variants.length} variant(s)</p>
            </div>
            {create.isError && <p className="text-xs text-red-600">{getApiErrorMessage(create.error)}</p>}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-ink-100 px-5 py-4 dark:border-ink-800">
        <Button variant="ghost" onClick={() => (step === 0 ? close() : setStep((s) => s - 1))}>
          <ArrowLeft className="h-3.5 w-3.5" /> {step === 0 ? 'Cancel' : 'Back'}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed}>
            Next <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button onClick={submit} loading={create.isPending}>
            <Send className="h-3.5 w-3.5" /> Create campaign
          </Button>
        )}
      </div>
    </Modal>
  );
}

function BulkOutreachInner() {
  const { data: seat } = useRecruiterSeat();
  const isPro = seat?.tier === 'pro';
  const { data: campaigns, isLoading, isError, error } = useBulkOutreachCampaigns();
  const sendCampaign = useSendBulkOutreachCampaign();
  const [wizardOpen, setWizardOpen] = useState(false);

  const columns: DataTableColumn<BulkOutreachCampaign>[] = [
    {
      key: 'name',
      header: 'Campaign',
      render: (row) => (
        <div>
          <p className="font-semibold text-ink-900 dark:text-white">{row.name}</p>
          <p className="text-xs capitalize text-ink-400 dark:text-ink-500">{row.channel}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (row) => <Badge tone={STATUS_TONE[row.status]} className="capitalize">{row.status}</Badge> },
    { key: 'audience_count', header: 'Audience', align: 'right', render: (row) => row.audience_count },
    { key: 'sent_count', header: 'Sent', align: 'right', render: (row) => row.sent_count },
    {
      key: 'reply_count',
      header: 'Reply rate',
      align: 'right',
      render: (row) => (row.sent_count > 0 ? `${Math.round((row.reply_count / row.sent_count) * 100)}%` : '—'),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) =>
        row.status === 'draft' ? (
          <Button size="sm" variant="outline" onClick={() => sendCampaign.mutate(row.id)} loading={sendCampaign.isPending}>
            <Send className="h-3.5 w-3.5" /> Send
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
            <Mail className="h-5 w-5 text-brand-600" /> Bulk Outreach
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Multi-step campaigns across email and LinkedIn with A/B variant testing.</p>
        </div>
        <Button onClick={() => setWizardOpen(true)} disabled={!isPro}>
          <Users className="h-3.5 w-3.5" /> New campaign
        </Button>
      </div>

      {!isPro && <ProUpgradeBanner feature="Bulk outreach campaigns" />}

      {isError && (
        <Card className="py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load campaigns</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      )}

      {!isError && (
        <DataTable
          columns={columns}
          data={campaigns || []}
          rowKey={(r) => r.id}
          isLoading={isLoading}
          emptyTitle="No campaigns yet"
          emptyDescription="Launch your first bulk outreach campaign to start sourcing at scale."
          emptyAction={
            isPro ? (
              <Button size="sm" onClick={() => setWizardOpen(true)}>
                New campaign
              </Button>
            ) : undefined
          }
        />
      )}

      <ComposerWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </div>
  );
}

export default function BulkOutreachPage() {
  return (
    <RecruiterSeatGate>
      <BulkOutreachInner />
    </RecruiterSeatGate>
  );
}
