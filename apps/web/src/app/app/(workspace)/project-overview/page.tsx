'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ProjectShell } from '@/components/projects/ProjectShell';
import { ProjectOverviewView } from '@/components/projects/ProjectOverviewView';

function ProjectOverviewInner() {
  const projectId = useSearchParams().get('projectId') || undefined;
  return (
    <ProjectShell projectId={projectId} activeTab="overview">
      {projectId && <ProjectOverviewView projectId={projectId} />}
    </ProjectShell>
  );
}

export default function ProjectOverviewPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <ProjectOverviewInner />
    </Suspense>
  );
}
