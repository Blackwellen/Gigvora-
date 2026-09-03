'use client';

import { use } from 'react';
import { ProjectShell } from '@/components/projects/ProjectShell';
import { ProjectOverviewView } from '@/components/projects/ProjectOverviewView';

// Canonical project entry route (18.02) — renders the same operational
// summary as 18.04 Project Overview via ProjectOverviewView, since the
// reference designs show one hub, not two distinct layouts.
export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <ProjectShell projectId={id} activeTab="overview">
      <ProjectOverviewView projectId={id} />
    </ProjectShell>
  );
}
