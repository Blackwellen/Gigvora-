'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';
import { useCopilot } from '@/hooks/useCopilot';

/**
 * Creates (or reuses) a Copilot thread scoped to this project via
 * ai_threads.context_json = { projectId } — see
 * modules/ai/copilotOrchestrator.service.js#gatherGroundedContext, which
 * reads that context to ground project-related questions in real Domain 18
 * data (summary, risks, blockers, milestones) through the same
 * permission-checked tool functions the REST API exposes.
 */
export function AskCopilotButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { createNewThread } = useCopilot(null);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const thread = await createNewThread({ title: 'Project Q&A', context: { projectId } });
      router.push(`/app/copilot-workspace?threadId=${thread.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-sm font-semibold text-purple-700 transition-colors hover:bg-purple-100 disabled:opacity-60 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-400 dark:hover:bg-purple-500/20"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      Ask Copilot
    </button>
  );
}
