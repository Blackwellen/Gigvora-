'use client';

import { useState } from 'react';
import { ChevronDown, Globe, Users, Lock, X, Plus, FileText, Loader2, Link as LinkIcon } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Popover, PopoverTrigger, PopoverContent, usePopoverClose } from '@/components/ui/Popover';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';
import { useSession } from '@/lib/session/SessionContext';
import { useLinkPreview, type Attachment } from '@/hooks/useFeed';
import { getApiErrorMessage } from '@/lib/api';

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public', description: 'Anyone on or off Gigvora', icon: Globe },
  { value: 'connections', label: 'Connections', description: 'Only your accepted connections', icon: Users },
  { value: 'private', label: 'Only me', description: 'Visible only to you', icon: Lock },
] as const;

export type Visibility = (typeof VISIBILITY_OPTIONS)[number]['value'];

/**
 * Who's posting: yourself, or a company page you're an active member of.
 * The choice is only advisory on the client — posts.service.js re-validates
 * companyId against a real, active company_members row server-side on every
 * create/update, so this selector can never let someone post as a company
 * they don't belong to.
 */
export function AuthorSelect({ companyId, onChange }: { companyId: string | null; onChange: (companyId: string | null) => void }) {
  const { user } = useSession();
  const { contexts } = useWorkspace();
  const fullName = user ? [user.first_name, user.last_name].filter(Boolean).join(' ') : '';
  const organizations = contexts?.organizations || [];
  const activeOrg = companyId ? organizations.find((o) => o.id === companyId) : null;

  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-ink-500 dark:text-ink-400">Author</p>
      <Popover>
        <PopoverTrigger>
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 px-3 py-2 text-left hover:border-ink-300"
          >
            <Avatar src={activeOrg ? activeOrg.logoUrl : user?.avatarUrl} name={activeOrg ? activeOrg.name : fullName} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink-900 dark:text-white">{activeOrg ? activeOrg.name : fullName || 'You'}</span>
              <span className="block truncate text-xs text-ink-500 dark:text-ink-400">{activeOrg ? `Posting as ${activeOrg.orgType}` : user?.headline || 'Posting as yourself'}</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-ink-400" />
          </button>
        </PopoverTrigger>
        <PopoverContent width="w-72">
          <AuthorOptions organizations={organizations} fullName={fullName} onChange={onChange} />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function AuthorOptions({
  organizations,
  fullName,
  onChange,
}: {
  organizations: Array<{ id: string; name: string; logoUrl: string | null; orgType: string }>;
  fullName: string;
  onChange: (companyId: string | null) => void;
}) {
  const close = usePopoverClose();
  return (
    <div className="max-h-72 overflow-y-auto py-1">
      <button
        type="button"
        onClick={() => {
          onChange(null);
          close();
        }}
        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-ink-50 dark:hover:bg-ink-800"
      >
        <Avatar name={fullName} size="xs" />
        <span className="truncate font-medium text-ink-800 dark:text-ink-100">{fullName || 'Yourself'}</span>
      </button>
      {organizations.length > 0 && <div className="my-1 border-t border-ink-100 dark:border-ink-800" />}
      {organizations.map((org) => (
        <button
          key={org.id}
          type="button"
          onClick={() => {
            onChange(org.id);
            close();
          }}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-ink-50 dark:hover:bg-ink-800"
        >
          <Avatar src={org.logoUrl} name={org.name} size="xs" />
          <span className="truncate font-medium text-ink-800 dark:text-ink-100">{org.name}</span>
        </button>
      ))}
      {organizations.length === 0 && <p className="px-2.5 py-1 text-xs text-ink-400 dark:text-ink-500">No company pages yet.</p>}
    </div>
  );
}

export function AudienceSelect({ value, onChange }: { value: Visibility; onChange: (v: Visibility) => void }) {
  const current = VISIBILITY_OPTIONS.find((o) => o.value === value)!;
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-ink-500 dark:text-ink-400">Audience</p>
      <Popover>
        <PopoverTrigger>
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 px-3 py-2 text-left hover:border-ink-300"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 dark:bg-ink-800 text-ink-600 dark:text-ink-300">
              <current.icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink-900 dark:text-white">{current.label}</span>
              <span className="block truncate text-xs text-ink-500 dark:text-ink-400">{current.description}</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-ink-400" />
          </button>
        </PopoverTrigger>
        <PopoverContent width="w-64">
          <AudienceOptions onChange={onChange} />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function AudienceOptions({ onChange }: { onChange: (v: Visibility) => void }) {
  const close = usePopoverClose();
  return (
    <div className="py-1">
      {VISIBILITY_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => {
            onChange(opt.value);
            close();
          }}
          className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-ink-50 dark:hover:bg-ink-800"
        >
          <opt.icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
          <span>
            <span className="block text-sm font-semibold text-ink-800 dark:text-ink-100">{opt.label}</span>
            <span className="block text-xs text-ink-500 dark:text-ink-400">{opt.description}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

export function TopicsInput({ topics, onChange }: { topics: string[]; onChange: (topics: string[]) => void }) {
  const [draft, setDraft] = useState('');

  function addTopic() {
    const cleaned = draft.trim().replace(/^#/, '');
    if (!cleaned || topics.includes(cleaned) || topics.length >= 10) {
      setDraft('');
      return;
    }
    onChange([...topics, cleaned]);
    setDraft('');
  }

  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-ink-500 dark:text-ink-400">Topics / hashtags</p>
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 p-2">
        {topics.map((topic) => (
          <span key={topic} className="flex items-center gap-1 rounded-full bg-brand-50 dark:bg-brand-500/15 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:text-brand-400">
            #{topic}
            <button type="button" onClick={() => onChange(topics.filter((t) => t !== topic))} aria-label={`Remove ${topic}`}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          id="post-topics-input"
          name="topicInput"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              addTopic();
            }
          }}
          onBlur={addTopic}
          aria-label="Add a topic or hashtag"
          placeholder={topics.length ? 'Add another…' : 'Add a topic and press Enter'}
          className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-ink-400 dark:placeholder:text-ink-500"
        />
      </div>
      {/* No topic/hashtag module exists yet — these are plain tags stored on
          the post, not a followable/browsable topic entity (Phase 3
          dependency). */}
    </div>
  );
}

export type LinkPreviewData = { url: string; title: string | null; description: string | null; imageUrl: string | null } | null;

export function LinkInput({ value, preview, onChange }: { value: string; preview: LinkPreviewData; onChange: (url: string, preview: LinkPreviewData) => void }) {
  const [error, setError] = useState<string | null>(null);
  const linkPreview = useLinkPreview();

  async function fetchPreview() {
    if (!value.trim()) return;
    setError(null);
    try {
      const result = await linkPreview.mutateAsync(value.trim());
      onChange(value.trim(), result);
      if (!result) setError('Could not generate a preview for this link, but it will still be attached.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not fetch a preview for this link.'));
    }
  }

  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-ink-500 dark:text-ink-400">Add a link (optional)</p>
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 px-3">
          <LinkIcon className="h-4 w-4 shrink-0 text-ink-400" aria-hidden />
          <input
            id="post-link-input"
            name="linkUrl"
            value={value}
            onChange={(e) => onChange(e.target.value, null)}
            onBlur={fetchPreview}
            aria-label="Link URL"
            placeholder="https://…"
            className="h-9 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-400 dark:placeholder:text-ink-500"
          />
          {linkPreview.isPending && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-ink-400" />}
        </div>
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('', null);
              setError(null);
            }}
            className="shrink-0 rounded-lg p-2 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800"
            aria-label="Remove link"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-ink-400 dark:text-ink-500">{error}</p>}
      {preview && (preview.title || preview.imageUrl) && (
        <div className="mt-2 flex gap-3 overflow-hidden rounded-xl border border-ink-100 dark:border-ink-800">
          {preview.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.imageUrl} alt="" className="h-20 w-28 shrink-0 object-cover" />
          )}
          <div className="min-w-0 flex-1 py-2 pr-2">
            {preview.title && <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{preview.title}</p>}
            {preview.description && <p className="line-clamp-2 text-xs text-ink-500 dark:text-ink-400">{preview.description}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export function MediaAttachmentList({ attachments, onRemove }: { attachments: Attachment[]; onRemove: (idx: number) => void }) {
  if (!attachments.length) return null;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {attachments.map((a, idx) => (
        <div key={idx} className="group relative overflow-hidden rounded-lg border border-ink-100 dark:border-ink-800">
          {a.type === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.url} alt={a.fileName || 'attachment'} className="h-24 w-full object-cover" />
          ) : a.type === 'video' ? (
            <video src={a.url} className="h-24 w-full bg-black object-cover" />
          ) : (
            <div className="flex h-24 flex-col items-center justify-center gap-1 bg-ink-50 dark:bg-ink-800 px-2 text-center">
              <FileText className="h-5 w-5 text-ink-400 dark:text-ink-500" />
              <span className="truncate text-[11px] text-ink-500 dark:text-ink-400">{a.fileName}</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => onRemove(idx)}
            className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
            aria-label="Remove attachment"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function AddTopicButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700">
      <Plus className="h-3 w-3" /> Add topic
    </button>
  );
}
