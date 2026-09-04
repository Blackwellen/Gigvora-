'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNowStrict } from 'date-fns';
import { ArrowLeft, ImageIcon, FileText, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AudienceSelect, TopicsInput, MediaAttachmentList, type Visibility } from '@/components/feed/PostEditorFields';
import { useOwnedPost, useUpdatePost, useUploadAttachment, type Attachment } from '@/hooks/useFeed';
import { useSession } from '@/lib/session/SessionContext';
import { getApiErrorMessage } from '@/lib/api';

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useSession();
  const { data: post, isLoading, isError, error: loadError } = useOwnedPost(id);
  const updatePost = useUpdatePost();
  const uploadAttachment = useUploadAttachment();

  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!post) return;
    setBody(post.body);
    setVisibility(post.visibility);
    setAttachments(post.attachments.filter((a) => a.type !== 'link_preview'));
    setTopics(post.topics);
  }, [post]);

  function markDirty<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setDirty(true);
      setSaved(false);
    };
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    try {
      const attachment = await uploadAttachment.mutateAsync(file);
      setAttachments((prev) => [...prev, attachment]);
      setDirty(true);
      setSaved(false);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not upload file.'));
    }
  }

  async function saveChanges() {
    if (!post) return;
    setError(null);
    try {
      const linkAttachments = post.attachments.filter((a) => a.type === 'link_preview');
      await updatePost.mutateAsync({ postId: post.id, body, visibility, attachments: [...attachments, ...linkAttachments], topics });
      setDirty(false);
      setSaved(true);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not save your changes.'));
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="mx-auto max-w-[720px] px-4 py-16 text-center">
        <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Can&apos;t edit this post</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(loadError, "This post doesn't exist, or you're not its author.")}</p>
      </div>
    );
  }

  const fullName = user ? [user.first_name, user.last_name].filter(Boolean).join(' ') : '';

  return (
    <div className="mx-auto px-4 py-5 lg:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push(`/app/post-detail/${post.id}`)}
              className="flex items-center gap-1.5 text-sm font-semibold text-ink-500 dark:text-ink-400 hover:text-ink-700 dark:hover:text-ink-200"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to post
            </button>
          </div>
          <h1 className="mt-1 font-display text-xl font-bold tracking-[-0.01em] text-ink-900 dark:text-white">Edit Post</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400">
            {post.editedAt ? `Last edited ${formatDistanceToNowStrict(new Date(post.editedAt), { addSuffix: true })}` : `Published ${formatDistanceToNowStrict(new Date(post.createdAt), { addSuffix: true })}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && !dirty && <span className="text-xs font-medium text-emerald-600">Saved</span>}
          <Button variant="outline" size="sm" onClick={() => router.push(`/app/post-detail/${post.id}`)}>
            Cancel
          </Button>
          <Button size="sm" onClick={saveChanges} disabled={!dirty || updatePost.isPending} loading={updatePost.isPending}>
            Save changes
          </Button>
        </div>
      </div>

      <Card className="space-y-4 p-5">
        <div>
          <label htmlFor="edit-post-body" className="mb-1.5 block text-xs font-semibold text-ink-500 dark:text-ink-400">
            Post body
          </label>
          <textarea
            id="edit-post-body"
            name="body"
            value={body}
            onChange={(e) => markDirty(setBody)(e.target.value)}
            rows={7}
            maxLength={3000}
            className="w-full resize-none rounded-xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 px-3.5 py-2.5 text-sm text-ink-900 dark:text-white focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
          />
          <p className="mt-1 text-right text-xs text-ink-400 dark:text-ink-500">{body.length} / 3000</p>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold text-ink-500 dark:text-ink-400">Media</p>
          <MediaAttachmentList attachments={attachments} onRemove={(idx) => markDirty(setAttachments)(attachments.filter((_, i) => i !== idx))} />
          <div className="mt-2 flex items-center gap-2">
            <EditMediaButton icon={ImageIcon} label="Add image / video" accept="image/*,video/*" onSelect={handleFileSelect} loading={uploadAttachment.isPending} />
            <EditMediaButton icon={FileText} label="Add document" accept=".pdf,.doc,.docx" onSelect={handleFileSelect} />
          </div>
        </div>

        <AudienceSelect value={visibility} onChange={markDirty(setVisibility)} />

        <TopicsInput topics={topics} onChange={markDirty(setTopics)} />

        {error && <p className="text-sm text-red-600">{error}</p>}
      </Card>

      <Card className="mt-4 p-5">
        <h3 className="mb-3 text-sm font-bold text-ink-900 dark:text-white">Preview</h3>
        <div className="rounded-xl border border-ink-100 dark:border-ink-800 p-4">
          <p className="text-sm font-semibold text-ink-900 dark:text-white">{fullName}</p>
          {user?.headline && <p className="text-xs text-ink-500 dark:text-ink-400">{user.headline}</p>}
          <p className="mt-2 whitespace-pre-wrap text-sm text-ink-800 dark:text-ink-100">{body || 'Your post will appear here…'}</p>
          {topics.length > 0 && (
            <p className="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold text-brand-600">
              {topics.map((t) => (
                <span key={t}>#{t}</span>
              ))}
            </p>
          )}
        </div>
      </Card>

      {/* Version history, an AI content-quality score, and AI edit
          suggestions appear in the reference design but have no real
          backing data/model here — omitted rather than faked. */}
    </div>
  );
}

function EditMediaButton({
  icon: Icon,
  label,
  accept,
  onSelect,
  loading,
}: {
  icon: typeof ImageIcon;
  label: string;
  accept: string;
  onSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  loading?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-600 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-800">
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
      {label}
      <input type="file" accept={accept} className="hidden" onChange={onSelect} />
    </label>
  );
}
