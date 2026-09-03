'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ProjectShell } from '@/components/projects/ProjectShell';
import { MessageThread } from '@/components/chat-bubble/MessageThread';
import { useProjectConversation } from '@/hooks/projects/useProjectChat';
import { useProjectMembers } from '@/hooks/projects/useProjectMembers';
import { useProject } from '@/hooks/projects/useProject';

// Domain 18 Phase B — Project Chat (18.13). Deliberately does NOT build a
// second messaging engine: MessageThread is the exact same component the
// main Inbox/chat bubble use (Domain 10), just embedded here scoped to the
// project's own conversation, which is lazily provisioned server-side the
// first time this page loads (see useProjectConversation).
function ProjectChatInner() {
  const projectId = useSearchParams().get('projectId') || undefined;
  const { data: project } = useProject(projectId);
  const { data: members } = useProjectMembers(projectId);
  const { data: conversation, isLoading, isError } = useProjectConversation(projectId);

  const participantsById = Object.fromEntries((members || []).map((m) => [m.userId, `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Member']));

  return (
    <ProjectShell projectId={projectId} activeTab="chat">
      <Card className="flex h-[calc(100vh-280px)] min-h-[480px] flex-col overflow-hidden">
        {isLoading && (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        )}
        {isError && (
          <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center text-sm text-ink-400 dark:text-ink-500">
            <p className="font-semibold text-ink-700 dark:text-ink-200">Chat isn&rsquo;t available right now</p>
            <p>Try reloading this page.</p>
          </div>
        )}
        {conversation && project && <MessageThread conversationId={conversation.conversationId} title={`${project.name} — Project Chat`} participantsById={participantsById} />}
      </Card>
    </ProjectShell>
  );
}

export default function ProjectChatPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <ProjectChatInner />
    </Suspense>
  );
}
