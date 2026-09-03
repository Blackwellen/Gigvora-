'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Briefcase, FolderKanban, Loader2, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

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

function normalize(project: ProjectRecord) {
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

function statusTone(status: string): 'brand' | 'neutral' | 'success' | 'warning' {
  const s = status?.toLowerCase();
  if (s === 'open' || s === 'active') return 'success';
  if (s === 'in_progress' || s === 'in progress') return 'brand';
  if (s === 'closed' || s === 'completed') return 'neutral';
  return 'warning';
}

export default function ProjectsPage() {
  const [offset, setOffset] = useState(0);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['projects', offset],
    queryFn: async () => (await api.get<{ data: ProjectRecord[] }>('/projects', { params: { limit: PAGE_SIZE, offset } })).data.data,
  });

  const projects = (data || []).map(normalize);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:px-0">
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
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="flex flex-col p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="text-sm font-bold text-ink-900 dark:text-white">{project.title}</h3>
                <Badge tone={statusTone(project.status)} className="shrink-0 capitalize">
                  {project.status?.replace(/_/g, ' ')}
                </Badge>
              </div>
              {project.description && (
                <p className="line-clamp-3 text-sm text-ink-500 dark:text-ink-400">{project.description}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-400 dark:text-ink-500">
                {project.category && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3" /> {project.category}
                  </span>
                )}
                {(project.location || project.isRemote) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {project.location || (project.isRemote ? 'Remote' : '')}
                    {project.location && project.isRemote ? ' · Remote' : ''}
                  </span>
                )}
              </div>
              {project.skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {project.skills.slice(0, 4).map((skill) => (
                    <Badge key={skill} tone="neutral">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}
              {project.postedByName && (
                <p className="mt-3 text-xs text-ink-400 dark:text-ink-500">Posted by {project.postedByName}</p>
              )}
            </Card>
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
    </div>
  );
}
