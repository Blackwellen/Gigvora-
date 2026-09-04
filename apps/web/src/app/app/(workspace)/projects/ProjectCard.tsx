import { Briefcase, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export type NormalizedProject = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  location: string | null;
  isRemote: boolean;
  skills: string[];
  status: string;
  postedByName: string | null;
};

function statusTone(status: string): 'brand' | 'neutral' | 'success' | 'warning' {
  const s = status?.toLowerCase();
  if (s === 'open' || s === 'active') return 'success';
  if (s === 'in_progress' || s === 'in progress') return 'brand';
  if (s === 'closed' || s === 'completed') return 'neutral';
  return 'warning';
}

export function ProjectCard({ project }: { project: NormalizedProject }) {
  return (
    <Card className="flex flex-col p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold text-ink-900 dark:text-white">{project.title}</h3>
        <Badge tone={statusTone(project.status)} className="shrink-0 capitalize">
          {project.status?.replace(/_/g, ' ')}
        </Badge>
      </div>
      {project.description && <p className="line-clamp-3 text-sm text-ink-500 dark:text-ink-400">{project.description}</p>}
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
      {project.postedByName && <p className="mt-3 text-xs text-ink-400 dark:text-ink-500">Posted by {project.postedByName}</p>}
    </Card>
  );
}
