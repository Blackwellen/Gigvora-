'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, UserPlus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ProjectShell } from '@/components/projects/ProjectShell';
import { useInviteToProject } from '@/hooks/projects/useProjectBids';
import { api, getApiErrorMessage } from '@/lib/api';

type TalentSummary = {
  id: string;
  slug: string;
  name: string;
  headline: string | null;
  location: string | null;
  skills: string[];
  verified: boolean;
  availability: 'available' | 'not_available';
};

function useTalentSearch(q: string) {
  return useQuery({
    queryKey: ['public-talent-search', q],
    queryFn: async () => {
      const { data } = await api.get<{ items: TalentSummary[] }>('/public/talent', { params: { q: q || undefined, availableOnly: true } });
      return data.items;
    },
  });
}

function InviteInner() {
  const projectId = useSearchParams().get('projectId') || undefined;
  const [query, setQuery] = useState('');
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const { data: results, isLoading } = useTalentSearch(query);
  const invite = useInviteToProject(projectId);
  const [error, setError] = useState<string | null>(null);

  async function handleInvite(slug: string) {
    setError(null);
    try {
      await invite.mutateAsync({ profileSlug: slug });
      setInvited((prev) => new Set(prev).add(slug));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not send the invitation.'));
    }
  }

  return (
    <ProjectShell projectId={projectId} activeTab="bids">
      <Card className="p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search professionals by name, skill, or role" className="pl-9" />
        </div>
      </Card>

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {!isLoading && (results || []).length === 0 && (
        <Card className="mt-3 py-14 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No professionals found</p>
          <p className="mt-1 text-sm text-ink-400 dark:text-ink-500">Try a different search term.</p>
        </Card>
      )}

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(results || []).map((p) => (
          <Card key={p.id} className="p-4">
            <div className="flex items-start gap-3">
              <Avatar name={p.name} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{p.name}</p>
                {p.headline && <p className="truncate text-xs text-ink-400 dark:text-ink-500">{p.headline}</p>}
                {p.verified && (
                  <Badge tone="success" className="mt-1">
                    Verified
                  </Badge>
                )}
              </div>
            </div>
            {p.skills?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {p.skills.slice(0, 4).map((s) => (
                  <span key={s} className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                    {s}
                  </span>
                ))}
              </div>
            )}
            <Button size="sm" className="mt-3 w-full" disabled={invited.has(p.slug)} loading={invite.isPending} onClick={() => handleInvite(p.slug)}>
              <UserPlus className="h-4 w-4" /> {invited.has(p.slug) ? 'Invited' : 'Invite to project'}
            </Button>
          </Card>
        ))}
      </div>
    </ProjectShell>
  );
}

export default function InviteToProjectPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <InviteInner />
    </Suspense>
  );
}
