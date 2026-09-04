'use client';

import { useState } from 'react';
import { AtSign, Loader2, MessageSquare, Send, Tag, Users, Workflow } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { RecruiterSeatGate } from '@/components/recruiter/RecruiterSeatGate';
import { ProUpgradeBanner } from '@/components/recruiter-pro/ProUpgradeBanner';
import { useRecruiterSeat } from '@/hooks/recruiter/useRecruiterSeat';
import { useRecruiterProjects } from '@/hooks/recruiter/useRecruiterProjects';
import { useCollaborationEvents, usePostComment } from '@/hooks/recruiter-pro/useTeamCollaboration';
import type { CollaborationEventType } from '@/hooks/recruiter-pro/types';
import { getApiErrorMessage } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

const EVENT_META: Record<CollaborationEventType, { icon: typeof MessageSquare; label: string; tone: 'brand' | 'success' | 'warning' | 'neutral' }> = {
  comment: { icon: MessageSquare, label: 'Comment', tone: 'brand' },
  mention: { icon: AtSign, label: 'Mention', tone: 'warning' },
  stage_move: { icon: Workflow, label: 'Stage move', tone: 'success' },
  assignment: { icon: Users, label: 'Assignment', tone: 'neutral' },
  note: { icon: Tag, label: 'Note', tone: 'neutral' },
  status_change: { icon: Workflow, label: 'Status change', tone: 'warning' },
};

function TeamCollaborationInner() {
  const { data: seat } = useRecruiterSeat();
  const isPro = seat?.tier === 'pro';
  const { data: projects } = useRecruiterProjects();
  const [projectId, setProjectId] = useState<string>('');
  const { data: events, isLoading, isError, error } = useCollaborationEvents(projectId || undefined);
  const postComment = usePostComment();
  const [comment, setComment] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    postComment.mutate({ project_id: projectId || undefined, body: comment.trim() }, { onSuccess: () => setComment('') });
  }

  return (
    <div className="mx-auto max-w-[1000px] space-y-5 px-4 py-5 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
            <Users className="h-5 w-5 text-purple-600" /> Team Collaboration
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Comments, mentions and pipeline activity across your hiring team.</p>
        </div>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="h-10 rounded-control border border-ink-200 bg-white px-3 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
        >
          <option value="">All projects</option>
          {projects?.data.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {!isPro && <ProUpgradeBanner feature="Team Collaboration" />}

      <Card>
        <CardHeader title="Post a comment" />
        <form onSubmit={handleSubmit} className="flex items-start gap-3 px-5 py-4">
          <Avatar name="You" size="sm" />
          <div className="flex-1 space-y-2">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              placeholder={projectId ? 'Share an update with the team...' : 'Select a project, then share an update...'}
              className="w-full rounded-control border border-ink-200 bg-white p-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
            />
            {postComment.isError && <p className="text-xs font-semibold text-red-600">{getApiErrorMessage(postComment.error)}</p>}
            <div className="flex justify-end">
              <Button type="submit" size="sm" loading={postComment.isPending} disabled={!comment.trim()}>
                <Send className="h-3.5 w-3.5" /> Post
              </Button>
            </div>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Activity feed" />
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
          </div>
        )}
        {isError && (
          <p className="px-5 py-8 text-center text-sm text-red-600">{getApiErrorMessage(error)}</p>
        )}
        {events && !isLoading && !isError && (
          <div className="divide-y divide-ink-50 dark:divide-ink-800/60">
            {events.length === 0 && <p className="px-5 py-10 text-center text-sm text-ink-400 dark:text-ink-500">No activity yet.</p>}
            {events.map((event) => {
              const meta = EVENT_META[event.event_type];
              const Icon = meta.icon;
              return (
                <div key={event.id} className="flex items-start gap-3 px-5 py-3.5">
                  <Avatar name={event.actor_name} src={event.actor_avatar_url} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-ink-900 dark:text-white">{event.actor_name}</span>
                      <Badge tone={meta.tone} className="inline-flex items-center gap-1">
                        <Icon className="h-3 w-3" /> {meta.label}
                      </Badge>
                      {event.project_name && <span className="text-xs text-ink-400 dark:text-ink-500">in {event.project_name}</span>}
                    </div>
                    <p className="mt-1 text-sm text-ink-700 dark:text-ink-200">{event.body}</p>
                    <p className="mt-0.5 text-xs text-ink-400 dark:text-ink-500">{formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

export default function TeamCollaborationPage() {
  return (
    <RecruiterSeatGate>
      <TeamCollaborationInner />
    </RecruiterSeatGate>
  );
}
