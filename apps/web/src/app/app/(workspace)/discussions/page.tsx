'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { formatDistanceToNowStrict } from 'date-fns';
import { Loader2, MessageSquare, Pin, Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { ProjectShell } from '@/components/projects/ProjectShell';
import { useProjectDiscussions, useCreateDiscussion, useUpdateDiscussion, useDiscussionReplies, useReplyToDiscussion } from '@/hooks/projects/useProjectDiscussions';
import { getApiErrorMessage } from '@/lib/api';

function DiscussionsInner() {
  const projectId = useSearchParams().get('projectId') || undefined;
  const [createOpen, setCreateOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const { data: discussions, isLoading, isError, error } = useProjectDiscussions(projectId);

  return (
    <ProjectShell
      projectId={projectId}
      activeTab="discussions"
      tabCounts={{ discussions: discussions?.length }}
      actions={
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New discussion
        </Button>
      }
    >
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}
      {isError && (
        <Card className="py-14 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load discussions</p>
          <p className="mt-1 text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      )}
      {!isLoading && !isError && discussions && discussions.length === 0 && (
        <Card className="py-14 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No discussions yet</p>
          <p className="mt-1 text-sm text-ink-400 dark:text-ink-500">Start a persistent thread for decisions or context — separate from live Project Chat.</p>
        </Card>
      )}

      {!isLoading && !isError && discussions && discussions.length > 0 && (
        <div className="space-y-2">
          {discussions.map((d) => (
            <Card key={d.id} className="p-4">
              <button type="button" onClick={() => setOpenId(openId === d.id ? null : d.id)} className="flex w-full items-start justify-between gap-3 text-left">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {d.pinned && <Pin className="h-3.5 w-3.5 text-brand-600" />}
                    <h3 className="truncate text-sm font-semibold text-ink-900 dark:text-white">{d.title}</h3>
                    {d.resolved && <Badge tone="success">Resolved</Badge>}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-500 dark:text-ink-400">{d.body}</p>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-xs text-ink-400 dark:text-ink-500">
                  <MessageSquare className="h-3.5 w-3.5" /> {d.replyCount}
                </span>
              </button>
              {openId === d.id && <DiscussionThread projectId={projectId!} discussionId={d.id} />}
            </Card>
          ))}
        </div>
      )}

      {projectId && <CreateDiscussionModal projectId={projectId} open={createOpen} onClose={() => setCreateOpen(false)} />}
    </ProjectShell>
  );
}

function DiscussionThread({ projectId, discussionId }: { projectId: string; discussionId: string }) {
  const { data: replies, isLoading } = useDiscussionReplies(projectId, discussionId);
  const reply = useReplyToDiscussion(projectId, discussionId);
  const [body, setBody] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    await reply.mutateAsync(body.trim());
    setBody('');
  }

  return (
    <div className="mt-3 space-y-2 border-t border-ink-100 pt-3 dark:border-ink-800">
      {isLoading && <Loader2 className="h-4 w-4 animate-spin text-ink-300" />}
      {!isLoading &&
        (replies || []).map((r) => (
          <div key={r.id} className="rounded-lg bg-ink-50 px-3 py-2 text-sm dark:bg-ink-800/60">
            <p className="text-ink-700 dark:text-ink-200">{r.body}</p>
            <p className="mt-0.5 text-[11px] text-ink-400 dark:text-ink-500">{formatDistanceToNowStrict(new Date(r.createdAt))} ago</p>
          </div>
        ))}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a reply..." className="flex-1" />
        <Button type="submit" size="sm" loading={reply.isPending} disabled={!body.trim()}>
          Reply
        </Button>
      </form>
    </div>
  );
}

function CreateDiscussionModal({ projectId, open, onClose }: { projectId: string; open: boolean; onClose: () => void }) {
  const createDiscussion = useCreateDiscussion(projectId);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    await createDiscussion.mutateAsync({ title, body });
    setTitle('');
    setBody('');
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="create-discussion-title" className="max-w-md">
      <ModalHeader title="New discussion" onClose={onClose} />
      <form onSubmit={handleSubmit} className="space-y-3 p-5">
        <Input data-autofocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Discussion title" required />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder="What would you like to discuss?"
          className="w-full rounded-control border border-ink-200 bg-white p-3 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-white"
          required
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={createDiscussion.isPending} disabled={!title.trim() || !body.trim()}>
            Post
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function DiscussionsPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <DiscussionsInner />
    </Suspense>
  );
}
