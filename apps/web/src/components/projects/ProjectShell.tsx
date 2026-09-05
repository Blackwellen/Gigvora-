'use client';

import axios from 'axios';
import { Loader2, ShieldAlert } from 'lucide-react';
import { getApiErrorMessage } from '@/lib/api';
import { useProject } from '@/hooks/projects/useProject';
import { useProjectMembers } from '@/hooks/projects/useProjectMembers';
import { ProjectHeader } from './ProjectHeader';
import { ProjectTabs, type ProjectTabKey } from './ProjectTabs';

/**
 * Every Domain 18 page shares this shell: fetch the project + membership,
 * render the header/tab strip, and gate the body on the same permission
 * check the server already enforces (403 from GET /pm-projects/:id) — this
 * is a UI affordance only, never the authorization boundary itself.
 */
export function ProjectShell({
  projectId,
  activeTab,
  tabCounts,
  actions,
  children,
}: {
  projectId: string | undefined;
  activeTab: ProjectTabKey;
  tabCounts?: Partial<Record<ProjectTabKey, number>>;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { data: project, isLoading, isError, error } = useProject(projectId);
  const { data: members } = useProjectMembers(projectId);

  if (!projectId) {
    return (
      <EmptyState title="No project selected" description="Choose a project from Projects Home to continue." />
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (isError) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    const isForbidden = status === 403;
    const isNotFound = status === 404;
    const isTransient = status === 429 || (typeof status === 'number' && status >= 500);
    return (
      <EmptyState
        icon={isForbidden || isTransient ? <ShieldAlert className="h-6 w-6 text-amber-500" /> : undefined}
        title={isForbidden ? "You don't have access to this project" : isNotFound ? 'Project not found' : isTransient ? 'Something went wrong loading this project' : 'Couldn’t load this project'}
        description={
          isTransient
            ? "This is likely temporary — please try again in a moment."
            : getApiErrorMessage(error, "This project doesn't exist or you don't have access to it.")
        }
      />
    );
  }

  if (!project) return null;

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-5 lg:px-6">
      <ProjectHeader project={project} members={members || []} actions={actions} />
      <ProjectTabs projectId={projectId} active={activeTab} counts={tabCounts} myRole={project.myRole} />
      <div className="pt-2">{children}</div>
    </div>
  );
}

export function EmptyState({ title, description, icon }: { title: string; description: string; icon?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-5 lg:px-6">
      <div className="rounded-2xl border border-dashed border-ink-200 bg-white py-16 text-center dark:border-ink-700 dark:bg-ink-900">
        <div className="mb-2 flex justify-center">{icon}</div>
        <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{description}</p>
      </div>
    </div>
  );
}
