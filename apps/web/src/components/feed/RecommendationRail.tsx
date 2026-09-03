'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Briefcase, MapPin, Check, FolderKanban, Mic, Radio, Clock, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { useFeedRecommendations, type ProjectSuggestion, type PodcastSuggestion, type WebinarSuggestion } from '@/hooks/useFeed';
import { api, getApiErrorMessage } from '@/lib/api';

export function RecommendationRail() {
  const { data, isLoading } = useFeedRecommendations();

  return (
    <div className="space-y-4">
      <PeopleCard people={data?.people} loading={isLoading} />
      <GigsCard gigs={data?.gigs} loading={isLoading} />
      <ProjectsCard projects={data?.projects} loading={isLoading} />
      <PodcastsCard podcasts={data?.podcasts} loading={isLoading} />
      <WebinarsCard webinars={data?.webinars} loading={isLoading} />
    </div>
  );
}

function PeopleCard({ people, loading }: { people?: Array<{ id: string; name: string; headline: string | null; mutualConnections: number }>; loading: boolean }) {
  const queryClient = useQueryClient();
  // Requested state is tracked per-person (not a single "dismissed" set that
  // yanks the row out of the list) so a successful Connect click flips the
  // button to a real "Requested" state the user can see, instead of the
  // person silently vanishing with no confirmation that anything happened.
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
  const [errorByPersonId, setErrorByPersonId] = useState<Record<string, string>>({});
  const connect = useMutation({
    mutationFn: async (userId: string) => api.post('/connections', { addressee_id: userId }),
    onSuccess: (_data, userId) => {
      setRequestedIds((prev) => new Set(prev).add(userId));
      setErrorByPersonId((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      // The suggestions feed excludes anyone with an existing connections
      // row (any status) server-side, so refetching drops this person from
      // future batches — the local "Requested" state covers the gap until
      // that refetch lands.
      queryClient.invalidateQueries({ queryKey: ['feed-recommendations'] });
    },
    onError: (err, userId) => {
      setErrorByPersonId((prev) => ({ ...prev, [userId]: getApiErrorMessage(err, 'Could not send request.') }));
    },
  });

  const visible = people || [];

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink-900 dark:text-white">People you may know</h3>
      </div>
      {loading && <RailSkeleton rows={3} />}
      {!loading && visible.length === 0 && <p className="text-sm text-ink-400 dark:text-ink-500">No new suggestions right now.</p>}
      <div className="space-y-3">
        {visible.map((person) => {
          const isRequested = requestedIds.has(person.id);
          const isPending = connect.isPending && connect.variables === person.id;
          const error = errorByPersonId[person.id];
          return (
            <div key={person.id} className="flex items-center gap-2.5">
              <Link href={`/profile/${person.id}`}>
                <Avatar name={person.name} size="sm" />
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/profile/${person.id}`} className="block truncate text-sm font-semibold text-ink-900 dark:text-white hover:underline">
                  {person.name}
                </Link>
                <p className="truncate text-xs text-ink-500 dark:text-ink-400">
                  {error || person.headline || (person.mutualConnections > 0 ? `${person.mutualConnections} mutual connections` : 'Gigvora member')}
                </p>
              </div>
              <button
                type="button"
                disabled={isRequested || isPending}
                onClick={() => connect.mutate(person.id)}
                className={
                  'shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ' +
                  (isRequested
                    ? 'flex items-center gap-1 border-transparent bg-ink-50 text-ink-400 dark:bg-ink-800 dark:text-ink-500'
                    : 'border-brand-200 text-brand-600 hover:bg-brand-50 disabled:opacity-60')
                }
              >
                {isRequested ? (
                  <>
                    <Check className="h-3 w-3" /> Requested
                  </>
                ) : isPending ? (
                  'Sending…'
                ) : (
                  'Connect'
                )}
              </button>
            </div>
          );
        })}
      </div>
      <Link href="/app/network" className="mt-3 inline-block text-xs font-semibold text-brand-600 hover:text-brand-700">
        View all
      </Link>
    </Card>
  );
}

function GigsCard({
  gigs,
  loading,
}: {
  gigs?: Array<{ id: string; title: string; companyName: string; location: string | null; workMode: string; employmentType: string; isNew: boolean }>;
  loading: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink-900 dark:text-white">Suggested Gigs</h3>
        <Link href="/app/gigs" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
          View all
        </Link>
      </div>
      {loading && <RailSkeleton rows={2} />}
      {!loading && (!gigs || gigs.length === 0) && <p className="text-sm text-ink-400 dark:text-ink-500">No suggested gigs yet.</p>}
      <div className="space-y-3">
        {gigs?.map((gig) => (
          <div key={gig.id} className="flex gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-900 text-xs font-bold text-white">
              {gig.companyName.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-900 dark:text-white">
                <span className="truncate">{gig.title}</span>
                {gig.isNew && (
                  <Badge tone="brand" className="shrink-0">
                    New
                  </Badge>
                )}
              </p>
              <p className="flex items-center gap-1 truncate text-xs text-ink-500 dark:text-ink-400">
                <Briefcase className="h-3 w-3 shrink-0" /> {gig.companyName}
              </p>
              {gig.location && (
                <p className="flex items-center gap-1 truncate text-xs text-ink-400 dark:text-ink-500">
                  <MapPin className="h-3 w-3 shrink-0" /> {gig.location} · {gig.workMode}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ProjectsCard({ projects, loading }: { projects?: ProjectSuggestion[]; loading: boolean }) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink-900 dark:text-white">Suggested Projects</h3>
        <Link href="/app/projects" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
          View all
        </Link>
      </div>
      {loading && <RailSkeleton rows={2} />}
      {!loading && (!projects || projects.length === 0) && <p className="text-sm text-ink-400 dark:text-ink-500">No suggested projects yet.</p>}
      <div className="space-y-3">
        {projects?.map((project) => (
          <div key={project.id} className="flex gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-900 text-white">
              <FolderKanban className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-900 dark:text-white">
                <span className="truncate">{project.title}</span>
                {project.isNew && (
                  <Badge tone="brand" className="shrink-0">
                    New
                  </Badge>
                )}
              </p>
              {project.category && (
                <p className="flex items-center gap-1 truncate text-xs text-ink-500 dark:text-ink-400">
                  <Briefcase className="h-3 w-3 shrink-0" /> {project.category}
                </p>
              )}
              {project.location && (
                <p className="flex items-center gap-1 truncate text-xs text-ink-400 dark:text-ink-500">
                  <MapPin className="h-3 w-3 shrink-0" /> {project.location} {project.isRemote ? '· Remote' : ''}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function PodcastsCard({ podcasts, loading }: { podcasts?: PodcastSuggestion[]; loading: boolean }) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink-900 dark:text-white">Suggested Podcasts</h3>
        <Link href="/app/podcasts" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
          View all
        </Link>
      </div>
      {loading && <RailSkeleton rows={2} />}
      {!loading && (!podcasts || podcasts.length === 0) && <p className="text-sm text-ink-400 dark:text-ink-500">No suggested podcasts yet.</p>}
      <div className="space-y-3">
        {podcasts?.map((podcast) => (
          <div key={podcast.id} className="flex gap-2.5">
            {podcast.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={podcast.coverImageUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-900 text-white">
                <Mic className="h-4 w-4" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-900 dark:text-white">
                <span className="truncate">{podcast.title}</span>
                {podcast.isNew && (
                  <Badge tone="brand" className="shrink-0">
                    New
                  </Badge>
                )}
              </p>
              <p className="truncate text-xs text-ink-500 dark:text-ink-400">{podcast.hostName || 'Gigvora'}</p>
              {podcast.durationSeconds != null && (
                <p className="flex items-center gap-1 truncate text-xs text-ink-400 dark:text-ink-500">
                  <Clock className="h-3 w-3 shrink-0" /> {Math.round(podcast.durationSeconds / 60)} min
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function WebinarsCard({ webinars, loading }: { webinars?: WebinarSuggestion[]; loading: boolean }) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink-900 dark:text-white">Suggested Webinars</h3>
        <Link href="/app/webinars" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
          View all
        </Link>
      </div>
      {loading && <RailSkeleton rows={2} />}
      {!loading && (!webinars || webinars.length === 0) && <p className="text-sm text-ink-400 dark:text-ink-500">No suggested webinars yet.</p>}
      <div className="space-y-3">
        {webinars?.map((webinar) => (
          <div key={webinar.id} className="flex gap-2.5">
            {webinar.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={webinar.coverImageUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-900 text-white">
                <Radio className="h-4 w-4" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-900 dark:text-white">
                <span className="truncate">{webinar.title}</span>
                {webinar.isNew && (
                  <Badge tone="brand" className="shrink-0">
                    New
                  </Badge>
                )}
              </p>
              {webinar.hostName && <p className="truncate text-xs text-ink-500 dark:text-ink-400">{webinar.hostName}</p>}
              {webinar.scheduledAt && (
                <p className="flex items-center gap-1 truncate text-xs text-ink-400 dark:text-ink-500">
                  <Calendar className="h-3 w-3 shrink-0" />
                  {new Date(webinar.scheduledAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function RailSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <div className="h-8 w-8 animate-pulse rounded-full bg-ink-100 dark:bg-ink-800" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-2/3 animate-pulse rounded bg-ink-100 dark:bg-ink-800" />
            <div className="h-2.5 w-1/2 animate-pulse rounded bg-ink-100 dark:bg-ink-800" />
          </div>
        </div>
      ))}
    </div>
  );
}
