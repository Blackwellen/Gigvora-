'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImageIcon, FileText, ListChecks, Loader2, Check } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AuthorSelect, AudienceSelect, TopicsInput, LinkInput, MediaAttachmentList, type Visibility, type LinkPreviewData } from '@/components/feed/PostEditorFields';
import { useCreatePost, useUpdatePost, useUploadAttachment, type Attachment } from '@/hooks/useFeed';
import { getApiErrorMessage } from '@/lib/api';

const AUTOSAVE_DELAY_MS = 1200;

export default function CreatePostPage() {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkPreview, setLinkPreview] = useState<LinkPreviewData>(null);
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [autosaveState, setAutosaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const draftIdRef = useRef<string | null>(null);
  const skipNextAutosave = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const createPost = useCreatePost();
  const updatePost = useUpdatePost();
  const uploadAttachment = useUploadAttachment();

  const hasContent = body.trim().length > 0 || attachments.length > 0 || (showPoll && pollQuestion.trim() && pollOptions.filter((o) => o.trim()).length >= 2);

  function buildAttachmentsForSave(): Attachment[] {
    const linkAttachment: Attachment[] =
      linkUrl.trim() && linkPreview
        ? [{ type: 'link_preview', url: linkPreview.url, fileName: linkPreview.title || linkPreview.url, metadata: { title: linkPreview.title, description: linkPreview.description, imageUrl: linkPreview.imageUrl } }]
        : [];
    return [...attachments, ...linkAttachment];
  }

  // Debounced draft autosave: the first save creates the draft row (status
  // 'draft'), every save after that PATCHes the same row. Nothing is saved
  // until there's real content, so visiting this page and leaving never
  // leaves behind an empty draft.
  useEffect(() => {
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    if (!hasContent) return;
    setAutosaveState('saving');
    const timer = setTimeout(async () => {
      try {
        const poll = showPoll && pollQuestion.trim() ? { question: pollQuestion, options: pollOptions.filter((o) => o.trim()), multipleChoice: false } : undefined;
        if (!draftIdRef.current) {
          const created = await createPost.mutateAsync({ body, visibility, companyId, attachments: buildAttachmentsForSave(), poll, topics, status: 'draft' });
          draftIdRef.current = created.id;
        } else {
          await updatePost.mutateAsync({ postId: draftIdRef.current, body, visibility, companyId, attachments: buildAttachmentsForSave(), topics, status: 'draft' });
        }
        setAutosaveState('saved');
      } catch {
        setAutosaveState('idle');
      }
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body, visibility, companyId, attachments, topics, linkUrl, linkPreview, showPoll, pollQuestion, pollOptions]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    try {
      const attachment = await uploadAttachment.mutateAsync(file);
      setAttachments((prev) => [...prev, attachment]);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not upload file.'));
    }
  }

  async function saveDraftNow() {
    setError(null);
    try {
      const poll = showPoll && pollQuestion.trim() ? { question: pollQuestion, options: pollOptions.filter((o) => o.trim()), multipleChoice: false } : undefined;
      if (!draftIdRef.current) {
        const created = await createPost.mutateAsync({ body, visibility, companyId, attachments: buildAttachmentsForSave(), poll, topics, status: 'draft' });
        draftIdRef.current = created.id;
      } else {
        await updatePost.mutateAsync({ postId: draftIdRef.current, body, visibility, companyId, attachments: buildAttachmentsForSave(), topics, status: 'draft' });
      }
      setAutosaveState('saved');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not save draft.'));
    }
  }

  async function publish() {
    if (!hasContent) return;
    setError(null);
    if (scheduleEnabled && !scheduledAt) {
      setError('Choose a date and time to schedule this post.');
      return;
    }
    const scheduledAtIso = scheduleEnabled && scheduledAt ? new Date(scheduledAt).toISOString() : null;
    const poll = showPoll && pollQuestion.trim() ? { question: pollQuestion, options: pollOptions.filter((o) => o.trim()), multipleChoice: false } : undefined;

    try {
      let postId = draftIdRef.current;
      if (!postId) {
        const created = await createPost.mutateAsync({ body, visibility, companyId, attachments: buildAttachmentsForSave(), poll, topics, status: 'published', scheduledAt: scheduledAtIso });
        postId = created.id;
      } else {
        await updatePost.mutateAsync({ postId, body, visibility, companyId, attachments: buildAttachmentsForSave(), topics, status: 'published', scheduledAt: scheduledAtIso });
      }
      router.push(`/app/post-detail/${postId}`);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not publish your post.'));
    }
  }

  const saving = createPost.isPending || updatePost.isPending;

  return (
    <div className="mx-auto px-4 py-5 lg:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold tracking-[-0.01em] text-ink-900 dark:text-white">Create Post</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400">Share valuable content with your network.</p>
        </div>
        <div className="flex items-center gap-2">
          <AutosaveIndicator state={autosaveState} />
          <Button variant="outline" size="sm" onClick={saveDraftNow} disabled={!hasContent || saving}>
            Save draft
          </Button>
          <Button size="sm" onClick={publish} disabled={!hasContent || saving} loading={createPost.isPending || updatePost.isPending}>
            {scheduleEnabled ? 'Schedule' : 'Publish'}
          </Button>
        </div>
      </div>

      <Card className="space-y-4 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AuthorSelect companyId={companyId} onChange={setCompanyId} />
          <AudienceSelect value={visibility} onChange={setVisibility} />
        </div>

        <div>
          <label htmlFor="create-post-body" className="mb-1.5 block text-xs font-semibold text-ink-500 dark:text-ink-400">
            What do you want to share?
          </label>
          <textarea
            id="create-post-body"
            name="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            maxLength={3000}
            placeholder="Share an update, insight, or opportunity…"
            className="w-full resize-none rounded-xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 px-3.5 py-2.5 text-sm text-ink-900 dark:text-white placeholder:text-ink-400 dark:placeholder:text-ink-500 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
          />
          <p className="mt-1 text-right text-xs text-ink-400 dark:text-ink-500">{body.length} / 3000</p>
        </div>

        <MediaAttachmentList attachments={attachments} onRemove={(idx) => setAttachments((prev) => prev.filter((_, i) => i !== idx))} />

        <div className="flex flex-wrap items-center gap-2">
          <MediaButton icon={ImageIcon} label="Image / Video" onClick={() => fileInputRef.current?.click()} loading={uploadAttachment.isPending} />
          <MediaButton icon={FileText} label="Document" onClick={() => docInputRef.current?.click()} />
          <MediaButton icon={ListChecks} label="Poll" active={showPoll} onClick={() => setShowPoll((v) => !v)} />
          <input ref={fileInputRef} id="create-post-media" name="media" type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />
          <input ref={docInputRef} id="create-post-document" name="document" type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFileSelect} />
        </div>

        {showPoll && (
          <div className="space-y-2 rounded-xl border border-ink-100 dark:border-ink-800 bg-ink-50/60 dark:bg-ink-800/40 p-3">
            <input
              id="create-post-poll-question"
              name="pollQuestion"
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              placeholder="Ask a question…"
              aria-label="Poll question"
              className="w-full rounded-md border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 px-2.5 py-1.5 text-sm focus:border-brand-400 focus:outline-none"
            />
            {pollOptions.map((opt, idx) => (
              <input
                key={idx}
                id={`create-post-poll-option-${idx}`}
                name={`pollOption${idx}`}
                value={opt}
                onChange={(e) => setPollOptions((prev) => prev.map((o, i) => (i === idx ? e.target.value : o)))}
                placeholder={`Option ${idx + 1}`}
                aria-label={`Poll option ${idx + 1}`}
                className="w-full rounded-md border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 px-2.5 py-1.5 text-sm focus:border-brand-400 focus:outline-none"
              />
            ))}
            {pollOptions.length < 5 && (
              <button type="button" onClick={() => setPollOptions((prev) => [...prev, ''])} className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                + Add option
              </button>
            )}
          </div>
        )}

        <TopicsInput topics={topics} onChange={setTopics} />

        <LinkInput value={linkUrl} preview={linkPreview} onChange={(url, preview) => { setLinkUrl(url); setLinkPreview(preview); }} />

        <div className="rounded-xl border border-ink-100 dark:border-ink-800 p-3">
          <label className="flex items-center gap-2.5 text-sm font-semibold text-ink-800 dark:text-ink-100">
            <input
              id="create-post-schedule-toggle"
              name="scheduleEnabled"
              type="checkbox"
              checked={scheduleEnabled}
              onChange={(e) => setScheduleEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
            />
            Schedule for later
          </label>
          {scheduleEnabled && (
            <input
              id="create-post-schedule-at"
              name="scheduledAt"
              type="datetime-local"
              aria-label="Scheduled date and time"
              value={scheduledAt}
              min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="mt-2 rounded-md border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 px-2.5 py-1.5 text-sm focus:border-brand-400 focus:outline-none"
            />
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </Card>

      {/* Cross-posting to LinkedIn/X/Facebook/Instagram, an AI writing
          assistant, and a numeric "content quality score" all appear in the
          reference design but have no real backing integration or model in
          this codebase — building them would mean either dead toggles or
          fabricated output, so they're omitted from this build entirely
          rather than shipped as decoration. */}
    </div>
  );
}

function AutosaveIndicator({ state }: { state: 'idle' | 'saving' | 'saved' }) {
  if (state === 'idle') return null;
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-ink-400 dark:text-ink-500">
      {state === 'saving' ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" /> Saving…
        </>
      ) : (
        <>
          <Check className="h-3 w-3 text-emerald-500" /> Draft saved
        </>
      )}
    </span>
  );
}

function MediaButton({ icon: Icon, label, onClick, active, loading }: { icon: typeof ImageIcon; label: string; onClick: () => void; active?: boolean; loading?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
        active ? 'border-brand-200 bg-brand-50 text-brand-700' : 'border-ink-200 dark:border-ink-700 text-ink-600 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-800'
      }`}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}
