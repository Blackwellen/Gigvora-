'use client';

import { useEffect, useRef, useState } from 'react';
import { ImageIcon, FileText, ListChecks, X, Globe, Users, Lock, ChevronDown, Loader2, Sparkles } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Popover, PopoverTrigger, PopoverContent, usePopoverClose } from '@/components/ui/Popover';
import { useSession } from '@/lib/session/SessionContext';
import { useCreatePost, useUploadAttachment, useSuggestTopics, type Attachment, type TopicSuggestion } from '@/hooks/useFeed';
import { getApiErrorMessage } from '@/lib/api';

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Anyone', icon: Globe },
  { value: 'connections', label: 'Connections', icon: Users },
  { value: 'private', label: 'Only me', icon: Lock },
] as const;

export function PostComposer({ autoFocus = false, initialBody = '' }: { autoFocus?: boolean; initialBody?: string }) {
  const { user } = useSession();
  const [body, setBody] = useState(initialBody);
  const [visibility, setVisibility] = useState<'public' | 'connections' | 'private'>('public');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [error, setError] = useState<string | null>(null);
  const [topics, setTopics] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const createPost = useCreatePost();
  const uploadAttachment = useUploadAttachment();
  const suggestTopics = useSuggestTopics();

  const fullName = user ? [user.first_name, user.last_name].filter(Boolean).join(' ') : '';
  const hasContent = body.trim().length > 0 || attachments.length > 0 || (showPoll && pollQuestion.trim() && pollOptions.filter((o) => o.trim()).length >= 2);

  // Debounced, optional topic suggestions — never auto-applied, purely a
  // tappable-chip suggestion surfaced while the author is typing. A
  // slow/unavailable ML service just leaves the suggestion row empty.
  useEffect(() => {
    const trimmed = body.trim();
    if (trimmed.length < 20) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      suggestTopics.mutate(trimmed, { onSuccess: (data) => setSuggestions(data || []) });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body]);

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

  async function handlePost() {
    if (!hasContent) return;
    setError(null);
    try {
      await createPost.mutateAsync({
        body,
        visibility,
        attachments,
        topics,
        poll: showPoll && pollQuestion.trim() ? { question: pollQuestion, options: pollOptions.filter((o) => o.trim()), multipleChoice: false } : undefined,
      });
      setBody('');
      setAttachments([]);
      setShowPoll(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      setTopics([]);
      setSuggestions([]);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not publish your post.'));
    }
  }

  return (
    <div className="rounded-2xl border border-ink-100 dark:border-ink-800 bg-white dark:bg-ink-900 p-4 shadow-surface">
      <div className="flex gap-3">
        <Avatar src={user?.avatarUrl} name={fullName} size="md" />
        <textarea
          id="post-composer-body"
          name="body"
          autoFocus={autoFocus}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={body ? 3 : 1}
          aria-label="Share an update, insight, or opportunity"
          placeholder="Share an update, insight, or opportunity..."
          className="w-full resize-none rounded-lg border border-ink-100 dark:border-ink-800 bg-ink-50/60 px-3.5 py-2.5 text-sm text-ink-900 dark:text-white placeholder:text-ink-400 dark:placeholder:text-ink-500 focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/15"
        />
      </div>

      {attachments.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {attachments.map((a, idx) => (
            <div key={idx} className="group relative overflow-hidden rounded-lg border border-ink-100 dark:border-ink-800">
              {a.type === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.url} alt={a.fileName || 'attachment'} className="h-24 w-full object-cover" />
              ) : (
                <div className="flex h-24 flex-col items-center justify-center gap-1 bg-ink-50 dark:bg-ink-800 px-2 text-center">
                  <FileText className="h-5 w-5 text-ink-400 dark:text-ink-500" />
                  <span className="truncate text-[11px] text-ink-500 dark:text-ink-400">{a.fileName}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Remove attachment"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showPoll && (
        <div className="mt-3 space-y-2 rounded-lg border border-ink-100 dark:border-ink-800 bg-ink-50/60 p-3">
          <input
            id="poll-question"
            name="pollQuestion"
            value={pollQuestion}
            onChange={(e) => setPollQuestion(e.target.value)}
            placeholder="Ask a question..."
            aria-label="Poll question"
            className="w-full rounded-md border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 px-2.5 py-1.5 text-sm focus:border-brand-400 focus:outline-none"
          />
          {pollOptions.map((opt, idx) => (
            <input
              key={idx}
              id={`poll-option-${idx}`}
              name={`pollOption${idx}`}
              value={opt}
              onChange={(e) => setPollOptions((prev) => prev.map((o, i) => (i === idx ? e.target.value : o)))}
              placeholder={`Option ${idx + 1}`}
              aria-label={`Poll option ${idx + 1}`}
              className="w-full rounded-md border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 px-2.5 py-1.5 text-sm focus:border-brand-400 focus:outline-none"
            />
          ))}
          <div className="flex items-center justify-between">
            {pollOptions.length < 5 && (
              <button type="button" onClick={() => setPollOptions((prev) => [...prev, ''])} className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                + Add option
              </button>
            )}
            <button type="button" onClick={() => setShowPoll(false)} className="text-xs font-semibold text-ink-500 dark:text-ink-400 hover:text-ink-700 dark:hover:text-ink-200">
              Remove poll
            </button>
          </div>
        </div>
      )}

      {topics.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {topics.map((topic) => (
            <button
              key={topic}
              type="button"
              onClick={() => setTopics((prev) => prev.filter((t) => t !== topic))}
              className="flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100"
            >
              #{topic} <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}

      {suggestions.filter((s) => !topics.includes(s.slug)).length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5" aria-label="Suggested topics">
          <span className="flex items-center gap-1 text-[11px] font-semibold text-ink-400 dark:text-ink-500">
            <Sparkles className="h-3 w-3" /> Suggested:
          </span>
          {suggestions
            .filter((s) => !topics.includes(s.slug))
            .map((s) => (
              <button
                key={s.topic_id}
                type="button"
                onClick={() => setTopics((prev) => [...prev, s.slug])}
                className="rounded-full border border-dashed border-ink-200 dark:border-ink-700 px-2.5 py-1 text-xs font-medium text-ink-500 dark:text-ink-400 hover:border-brand-300 hover:text-brand-700"
              >
                + #{s.label}
              </button>
            ))}
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 dark:border-ink-800 pt-3">
        <div className="flex flex-wrap items-center gap-1">
          <ComposerAction icon={ImageIcon} label="Photo / Video" onClick={() => fileInputRef.current?.click()} loading={uploadAttachment.isPending} />
          <ComposerAction icon={FileText} label="Document" onClick={() => docInputRef.current?.click()} />
          <ComposerAction icon={ListChecks} label="Poll" onClick={() => setShowPoll((v) => !v)} active={showPoll} />
          <input id="post-media-input" name="media" ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />
          <input id="post-document-input" name="document" ref={docInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFileSelect} />
        </div>

        <div className="flex items-center gap-2">
          <VisibilitySelector value={visibility} onChange={setVisibility} />
          <Button size="sm" onClick={handlePost} disabled={!hasContent} loading={createPost.isPending}>
            Post
          </Button>
        </div>
      </div>
    </div>
  );
}

function ComposerAction({
  icon: Icon,
  label,
  onClick,
  active,
  loading,
}: {
  icon: typeof ImageIcon;
  label: string;
  onClick: () => void;
  active?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
        active ? 'bg-brand-50 text-brand-700' : 'text-ink-500 hover:bg-ink-100'
      }`}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}

function VisibilitySelector({ value, onChange }: { value: string; onChange: (v: 'public' | 'connections' | 'private') => void }) {
  const current = VISIBILITY_OPTIONS.find((o) => o.value === value)!;
  return (
    <Popover>
      <PopoverTrigger>
        <button type="button" className="flex items-center gap-1 rounded-lg border border-ink-200 dark:border-ink-700 px-2.5 py-1.5 text-xs font-semibold text-ink-600 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-800">
          <current.icon className="h-3.5 w-3.5" /> {current.label} <ChevronDown className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent width="w-48" align="end">
        <VisibilityOptions onChange={onChange} />
      </PopoverContent>
    </Popover>
  );
}

function VisibilityOptions({ onChange }: { onChange: (v: 'public' | 'connections' | 'private') => void }) {
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
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-ink-700 dark:text-ink-200 hover:bg-ink-50 dark:hover:bg-ink-800"
        >
          <opt.icon className="h-4 w-4 text-ink-400 dark:text-ink-500" /> {opt.label}
        </button>
      ))}
    </div>
  );
}
