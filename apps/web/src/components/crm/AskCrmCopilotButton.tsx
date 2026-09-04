'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';
import { useCopilot } from '@/hooks/useCopilot';
import type { CrmObjectType } from '@/hooks/crm/types';

/**
 * Creates (or reuses) a Copilot thread scoped to a CRM object via
 * ai_threads.context_json = { crmObjectType, crmObjectId }, modeled exactly
 * on AskCopilotButton.tsx's { projectId } pattern.
 *
 * NOTE (frontend-only deliverable — backend grounding not wired): unlike
 * projectId, modules/ai/copilotOrchestrator.service.js#gatherGroundedContext
 * has no crmObjectType/crmObjectId branch yet, so a thread created here will
 * NOT be grounded in real CRM data until that orchestrator gets a matching
 * case (read the crmObjectType, fetch the record via the same
 * permission-checked CRM services, and fold it into the context passed to
 * the model). That's a small, contained addition but is out of scope for
 * this hooks/components pass — flagging it here for the page-building
 * session and whoever picks up the orchestrator work.
 */
export function AskCrmCopilotButton({ crmObjectType, crmObjectId }: { crmObjectType: CrmObjectType; crmObjectId: string }) {
  const router = useRouter();
  const { createNewThread } = useCopilot(null);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const thread = await createNewThread({ title: 'CRM Q&A', context: { crmObjectType, crmObjectId } });
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
