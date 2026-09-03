'use client';

import axios from 'axios';
import { Loader2, ShieldAlert } from 'lucide-react';
import { getApiErrorMessage } from '@/lib/api';
import { useApplication } from '@/hooks/jobs/useApplication';
import { ApplicationHeader } from './ApplicationHeader';
import { ApplicationTabs, type ApplicationStageKey } from './ApplicationTabs';

/**
 * Shared hub shell for the application/candidate-journey pages (application-detail,
 * assessment, interview, offer, hire-handoff — all keyed by applicationId and
 * representing sequential stages of one candidate's journey through one application).
 * Mirrors ProjectShell's fetch-header-tabs-body composition, but the "tabs" are a
 * sequential stage tracker (ApplicationTabs) rather than independent sections, since
 * stages happen in order and each carries a done/current/upcoming/skipped status.
 *
 * Screening (16.12) is job-scoped, not application-scoped (it's a recruiter's queue
 * across many applications for one job), so it intentionally does NOT use this shell.
 */
export function ApplicationShell({
  applicationId,
  activeStage,
  actions,
  children,
}: {
  applicationId: string | undefined;
  activeStage: ApplicationStageKey;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { data: application, isLoading, isError, error } = useApplication(applicationId);

  if (!applicationId) {
    return <EmptyState title="No application selected" description="Choose an application from Job Applicants to continue." />;
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
        title={
          isForbidden
            ? "You don't have access to this application"
            : isNotFound
              ? 'Application not found'
              : isTransient
                ? 'Something went wrong loading this application'
                : "Couldn't load this application"
        }
        description={
          isTransient
            ? 'This is likely temporary — please try again in a moment.'
            : getApiErrorMessage(error, "This application doesn't exist or you don't have access to it.")
        }
      />
    );
  }

  if (!application) return null;

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-5 lg:px-6">
      <ApplicationHeader application={application} actions={actions} />
      <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-surface dark:border-ink-800 dark:bg-ink-900">
        <ApplicationTabs applicationId={applicationId} status={application.status} active={activeStage} />
      </div>
      <div className="pt-1">{children}</div>
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
