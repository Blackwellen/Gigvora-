'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, FolderKanban } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageContainer } from '@/components/ui/PageContainer';
import { api } from '@/lib/api';
import { ProjectCard, type NormalizedProject } from './ProjectCard';

type ProjectRecord = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  location: string | null;
  is_remote?: boolean;
  isRemote?: boolean;
  skills_needed?: string[];
  skillsNeeded?: string[];
  status: string;
  posted_by_name?: string | null;
  postedByName?: string | null;
};

const PAGE_SIZE = 20;

function normalize(project: ProjectRecord): NormalizedProject {
  return {
    id: project.id,
    title: project.title,
    description: project.description,
    category: project.category,
    location: project.location,
    isRemote: project.isRemote ?? project.is_remote ?? false,
    skills: project.skillsNeeded ?? project.skills_needed ?? [],
    status: project.status,
    postedByName: project.postedByName ?? project.posted_by_name ?? null,
  };
}

export default function ProjectsPage() {
  const [offset, setOffset] = useState(0);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['projects', offset],
    queryFn: async () => (await api.get<{ data: ProjectRecord[] }>('/projects', { params: { limit: PAGE_SIZE, offset } })).data.data,
  });

  const projects = (data || []).map(normalize);

  return (
    <PageContainer className="py-6">
      <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
        <FolderKanban className="h-5 w-5" /> Projects
      </h1>
      <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Browse open projects from across the Gigvora community.</p>

      {isLoading && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-ink-100 dark:bg-ink-800" />
          ))}
        </div>
      )}

      {isError && !isLoading && (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-red-200 bg-red-50/40 py-16 text-center dark:border-red-500/30 dark:bg-red-500/5">
          <AlertTriangle className="h-6 w-6 text-red-500" />
          <p className="text-sm font-semibold text-ink-800 dark:text-ink-100">Couldn&rsquo;t load projects</p>
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {!isLoading && !isError && projects.length === 0 && offset === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-ink-200 py-16 text-center dark:border-ink-700">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No projects yet</p>
          <p className="mt-1 text-sm text-ink-400 dark:text-ink-500">Check back soon — new projects will show up here.</p>
        </div>
      )}

      {!isLoading && !isError && projects.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {!isLoading && !isError && (offset > 0 || (data && data.length === PAGE_SIZE)) && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button type="button" variant="outline" disabled={offset === 0} onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}>
            Previous
          </Button>
          <Button type="button" variant="outline" disabled={!data || data.length < PAGE_SIZE} onClick={() => setOffset((prev) => prev + PAGE_SIZE)}>
            Next
          </Button>
        </div>
      )}
    </PageContainer>
  );
}
