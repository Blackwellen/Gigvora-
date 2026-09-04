'use client';

import { useState } from 'react';
import { Copy, Loader2, Mail, MessageSquare, Pencil, Plus, Trash2 } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { RecruiterSeatGate } from '@/components/recruiter/RecruiterSeatGate';
import { ProUpgradeBanner } from '@/components/recruiter-pro/ProUpgradeBanner';
import { useRecruiterSeat } from '@/hooks/recruiter/useRecruiterSeat';
import {
  useOutreachTemplates,
  useCreateOutreachTemplate,
  useUpdateOutreachTemplate,
  useDeleteOutreachTemplate,
} from '@/hooks/recruiter-pro/useOutreachTemplates';
import type { OutreachChannel, OutreachTemplate } from '@/hooks/recruiter-pro/types';
import { getApiErrorMessage } from '@/lib/api';

const CHANNEL_ICON: Record<OutreachChannel, typeof Mail> = { email: Mail, linkedin: MessageSquare };

function TemplateEditor({
  open,
  onClose,
  template,
}: {
  open: boolean;
  onClose: () => void;
  template: OutreachTemplate | null;
}) {
  const create = useCreateOutreachTemplate();
  const update = useUpdateOutreachTemplate();
  const [name, setName] = useState(template?.name || '');
  const [channel, setChannel] = useState<OutreachChannel>(template?.channel || 'email');
  const [subject, setSubject] = useState(template?.subject || '');
  const [body, setBody] = useState(template?.body || '');

  const mutation = template ? update : create;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (template) {
      update.mutate({ id: template.id, name, channel, subject: subject || undefined, body }, { onSuccess: onClose });
    } else {
      create.mutate({ name, channel, subject: subject || undefined, body }, { onSuccess: onClose });
    }
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-lg" labelledBy="template-editor-title">
      <ModalHeader title={template ? 'Edit template' : 'New template'} onClose={onClose} />
      <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-ink-500 dark:text-ink-400">Name</label>
          <Input data-autofocus value={name} onChange={(e) => setName(e.target.value)} required placeholder="Initial LinkedIn outreach" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-ink-500 dark:text-ink-400">Channel</label>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as OutreachChannel)}
            className="h-10 w-full rounded-control border border-ink-200 bg-white px-3 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
          >
            <option value="email">Email</option>
            <option value="linkedin">LinkedIn</option>
          </select>
        </div>
        {channel === 'email' && (
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-500 dark:text-ink-400">Subject</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="We think you'd be a great fit for {{role}}" />
          </div>
        )}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-ink-500 dark:text-ink-400">Message body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={6}
            className="w-full rounded-control border border-ink-200 bg-white p-3 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
            placeholder="Hi {{first_name}}, I came across your profile and..."
          />
        </div>
        {mutation.isError && <p className="text-xs font-semibold text-red-600">{getApiErrorMessage(mutation.error)}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={mutation.isPending}>{template ? 'Save changes' : 'Create template'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function OutreachTemplatesInner() {
  const { data: seat } = useRecruiterSeat();
  const isPro = seat?.tier === 'pro';
  const [channelFilter, setChannelFilter] = useState<OutreachChannel | 'all'>('all');
  const { data, isLoading, isError, error } = useOutreachTemplates(channelFilter);
  const del = useDeleteOutreachTemplate();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<OutreachTemplate | null>(null);

  function openCreate() {
    setEditing(null);
    setEditorOpen(true);
  }
  function openEdit(t: OutreachTemplate) {
    setEditing(t);
    setEditorOpen(true);
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 px-4 py-5 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
            <Mail className="h-5 w-5 text-purple-600" /> Outreach Templates
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Reusable email and LinkedIn message templates for candidate outreach.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> New template
        </Button>
      </div>

      {!isPro && <ProUpgradeBanner feature="Outreach Templates" />}

      <Tabs
        value={channelFilter}
        onChange={(key) => setChannelFilter(key as OutreachChannel | 'all')}
        tabs={[
          { key: 'all', label: 'All channels' },
          { key: 'email', label: 'Email' },
          { key: 'linkedin', label: 'LinkedIn' },
        ]}
      />

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {isError && (
        <Card className="py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load templates</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      )}

      {data && !isLoading && !isError && (
        <>
          {data.length === 0 ? (
            <Card className="py-16 text-center">
              <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No templates yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">Create your first outreach template to speed up candidate messaging.</p>
              <Button className="mt-4" onClick={openCreate}><Plus className="h-4 w-4" /> New template</Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.map((t) => {
                const Icon = CHANNEL_ICON[t.channel];
                return (
                  <Card key={t.id} className="flex flex-col">
                    <CardHeader
                      title={t.name}
                      action={
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(t)} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800" aria-label="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => del.mutate(t.id)}
                            className="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      }
                    />
                    <div className="flex-1 space-y-2 px-5 pb-4 pt-2">
                      <div className="flex items-center gap-2">
                        <Badge tone="brand" className="inline-flex items-center gap-1 capitalize">
                          <Icon className="h-3 w-3" /> {t.channel}
                        </Badge>
                        <Badge tone="neutral" className="inline-flex items-center gap-1">
                          <Copy className="h-3 w-3" /> {t.usage_count} used
                        </Badge>
                      </div>
                      {t.subject && <p className="truncate text-xs font-semibold text-ink-600 dark:text-ink-300">Subject: {t.subject}</p>}
                      <p className="line-clamp-4 text-xs text-ink-500 dark:text-ink-400">{t.body}</p>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      <TemplateEditor open={editorOpen} onClose={() => setEditorOpen(false)} template={editing} />
    </div>
  );
}

export default function OutreachTemplatesPage() {
  return (
    <RecruiterSeatGate>
      <OutreachTemplatesInner />
    </RecruiterSeatGate>
  );
}
