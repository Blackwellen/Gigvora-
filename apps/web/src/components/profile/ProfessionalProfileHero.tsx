'use client';

import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Camera, MessageSquare, MoreHorizontal, ShieldCheck, UserPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { api, getApiErrorMessage } from '@/lib/api';
import { PROFILE_HERO_KEY, type ProfileHero } from '@/lib/professionalProfile/api';

const AVAILABILITY_LABEL: Record<ProfileHero['availabilityStatus'], { label: string; tone: 'success' | 'brand' | 'neutral' } | null> = {
  open_to_work: { label: 'Open to work', tone: 'success' },
  open_to_projects: { label: 'Available for projects', tone: 'brand' },
  not_available: { label: 'Not available', tone: 'neutral' },
  unspecified: null,
};

export function ProfessionalProfileHero({ hero }: { hero: ProfileHero }) {
  const queryClient = useQueryClient();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<'cover' | 'avatar' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(kind: 'cover' | 'avatar', file: File) {
    setUploading(kind);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post(`/professional-profile/me/${kind}`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      queryClient.setQueryData(PROFILE_HERO_KEY, data.data);
    } catch (err) {
      setError(getApiErrorMessage(err, `Couldn't upload ${kind === 'cover' ? 'cover image' : 'photo'}.`));
    } finally {
      setUploading(null);
    }
  }

  const availability = AVAILABILITY_LABEL[hero.availabilityStatus];

  return (
    <div className="overflow-hidden rounded-panel border border-ink-100/80 bg-white shadow-surface dark:border-ink-800/80 dark:bg-ink-900">
      <div className="relative h-40 w-full bg-gradient-to-br from-brand-100 via-indigo-100 to-amber-50 dark:from-brand-950 dark:via-ink-900 dark:to-ink-900 sm:h-56">
        {hero.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero.coverUrl} alt="" className="h-full w-full object-cover" />
        )}
        <button
          type="button"
          onClick={() => coverInputRef.current?.click()}
          disabled={uploading === 'cover'}
          className="absolute right-3 top-3 flex items-center gap-1.5 rounded-lg bg-black/45 px-2.5 py-1.5 text-xs font-semibold text-white backdrop-blur hover:bg-black/60"
        >
          {uploading === 'cover' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
          Edit cover
        </button>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleUpload('cover', e.target.files[0])}
        />
      </div>

      <div className="px-4 pb-4 sm:px-6 sm:pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="relative -mt-14 shrink-0 sm:-mt-16">
              <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-white bg-brand-100 shadow-lg dark:border-ink-900 sm:h-36 sm:w-36">
                {hero.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={hero.avatarUrl} alt={hero.displayName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-brand-700">
                    {hero.displayName
                      .split(' ')
                      .slice(0, 2)
                      .map((p) => p[0])
                      .join('')}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploading === 'avatar'}
                className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-ink-900 text-white shadow ring-2 ring-white hover:bg-ink-800 dark:ring-ink-900"
                aria-label="Change profile photo"
              >
                {uploading === 'avatar' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleUpload('avatar', e.target.files[0])}
              />
            </div>

            <div className="pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-xl font-bold tracking-[-0.01em] text-ink-900 dark:text-white sm:text-2xl">{hero.displayName}</h1>
                {hero.verificationStatus === 'verified' && (
                  <span title="Verified professional">
                    <ShieldCheck className="h-5 w-5 text-brand-600" />
                  </span>
                )}
                {hero.trustBand && (
                  <Badge tone="brand" className="capitalize">
                    {hero.trustBand}
                  </Badge>
                )}
              </div>
              {hero.headline && <p className="mt-0.5 text-base font-medium text-ink-700 dark:text-ink-200">{hero.headline}</p>}
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-400 dark:text-ink-500">
                {hero.location && <span>{hero.location}</span>}
                {hero.timezone && <span>Local time zone: {hero.timezone}</span>}
              </div>
              {availability && (
                <div className="mt-2">
                  <Badge tone={availability.tone}>{availability.label}</Badge>
                </div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button type="button" variant="primary" size="sm">
              <MessageSquare className="h-4 w-4" /> Message
            </Button>
            <Button type="button" variant="outline" size="sm">
              <UserPlus className="h-4 w-4" /> Connect
            </Button>
            <Button type="button" variant="ghost" size="icon" aria-label="More">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-ink-100 pt-3 text-sm dark:border-ink-800">
          <StatItem label="Connections" value={hero.connectionCount} />
          <StatItem label="Followers" value={hero.followerCount} />
          <StatItem label="Following" value={hero.followingCount} />
          <StatItem label="Profile views" value={hero.profileViewsTotal} />
          {hero.trustScore != null && <StatItem label="Trust score" value={`${hero.trustScore}/100`} />}
          {hero.completenessScore != null && <StatItem label="Profile completeness" value={`${hero.completenessScore}%`} />}
        </div>
        {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
      </div>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="font-display text-sm font-bold text-ink-900 dark:text-white">{value}</span>
      <span className="text-xs text-ink-400 dark:text-ink-500">{label}</span>
    </div>
  );
}
