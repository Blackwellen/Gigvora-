'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Check, ExternalLink, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CountrySelect } from '@/components/ui/CountrySelect';
import { Card } from '@/components/ui/Card';
import { api, getApiErrorMessage } from '@/lib/api';
import { fetchHero, PROFILE_HERO_KEY, PROFILE_TABS, type ProfileHero } from '@/lib/professionalProfile/api';
import { cn } from '@/lib/cn';

const SECTIONS = [
  { key: 'overview', label: 'Overview' },
  { key: 'headline', label: 'Headline & Summary' },
  { key: 'media', label: 'Photo & Cover' },
  { key: 'sections', label: 'Profile sections' },
] as const;

/**
 * §39-40: Edit Profile is a management surface with its own internal section
 * rail (allowed — it is not the global app nav). It edits the SAME
 * `profiles` row every other tab reads, so a cover/avatar change here shows
 * up on every profile tab immediately (§40) rather than creating a per-page
 * setting.
 */
export default function EditProfilePage() {
  const queryClient = useQueryClient();
  const { data: hero } = useQuery({ queryKey: PROFILE_HERO_KEY, queryFn: fetchHero });
  const [active, setActive] = useState<(typeof SECTIONS)[number]['key']>('overview');

  const [headline, setHeadline] = useState('');
  const [summary, setSummary] = useState('');
  const [location, setLocation] = useState('');
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hero) return;
    setHeadline(hero.headline || '');
    setSummary(hero.summary || '');
    setLocation(hero.location || '');
    setCountryCode(hero.countryCode || null);
  }, [hero]);

  const saveAbout = useMutation({
    mutationFn: () => api.patch('/professional-profile/me/about', { headline, bio: summary, location, countryCode }),
    onSuccess: (res) => {
      queryClient.setQueryData(PROFILE_HERO_KEY, res.data.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<'cover' | 'avatar' | null>(null);

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

  if (!hero) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-5 px-4 py-6 lg:grid-cols-[240px_minmax(0,1fr)_320px] lg:px-8">
      <aside className="lg:sticky lg:top-4 lg:self-start">
        <nav className="space-y-1">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setActive(s.key)}
              className={cn(
                'block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold',
                active === s.key ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400' : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800'
              )}
            >
              {s.label}
            </button>
          ))}
        </nav>
        <Link href="/app/timeline" className="mt-4 flex items-center gap-1.5 px-3 text-sm font-semibold text-brand-600 hover:underline">
          Preview profile <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </aside>

      <main className="min-w-0 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-xl font-bold text-ink-900 dark:text-white">Edit profile</h1>
          {saved && (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <Check className="h-3.5 w-3.5" /> Saved
            </span>
          )}
        </div>

        {active === 'overview' && (
          <Card className="space-y-3 p-5">
            <h2 className="font-display text-sm font-bold text-ink-900 dark:text-white">Overview</h2>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">Display name</p>
              <Input value={hero.displayName} disabled />
              <p className="mt-1 text-xs text-ink-400">Managed in Account settings.</p>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">Location</p>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Austin, TX" />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">Country</p>
              <CountrySelect value={countryCode} onChange={setCountryCode} emptyLabel="Select a country" />
            </div>
            {error && <p className="text-xs font-medium text-red-600">{error}</p>}
            <Button type="button" size="sm" onClick={() => saveAbout.mutate()} disabled={saveAbout.isPending}>
              {saveAbout.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
            </Button>
          </Card>
        )}

        {active === 'headline' && (
          <Card className="space-y-3 p-5">
            <h2 className="font-display text-sm font-bold text-ink-900 dark:text-white">Headline & Summary</h2>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">Headline</p>
              <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Senior Product Designer" />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">Professional summary</p>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={6}
                className="w-full rounded-control border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
              />
            </div>
            {error && <p className="text-xs font-medium text-red-600">{error}</p>}
            <Button type="button" size="sm" onClick={() => saveAbout.mutate()} disabled={saveAbout.isPending}>
              {saveAbout.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
            </Button>
          </Card>
        )}

        {active === 'media' && (
          <Card className="space-y-4 p-5">
            <h2 className="font-display text-sm font-bold text-ink-900 dark:text-white">Photo & Cover</h2>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">Cover image</p>
              <div className="h-32 w-full overflow-hidden rounded-lg bg-ink-100 dark:bg-ink-800">
                {hero.coverUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={hero.coverUrl} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload('cover', e.target.files[0])} />
              <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => coverInputRef.current?.click()} disabled={uploading === 'cover'}>
                {uploading === 'cover' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />} Change cover
              </Button>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">Profile photo</p>
              <div className="h-20 w-20 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                {hero.avatarUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={hero.avatarUrl} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload('avatar', e.target.files[0])} />
              <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => avatarInputRef.current?.click()} disabled={uploading === 'avatar'}>
                {uploading === 'avatar' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />} Change photo
              </Button>
            </div>
            {error && <p className="text-xs font-medium text-red-600">{error}</p>}
          </Card>
        )}

        {active === 'sections' && (
          <Card className="p-5">
            <h2 className="font-display text-sm font-bold text-ink-900 dark:text-white">Profile sections</h2>
            <p className="mt-1 text-sm text-ink-400 dark:text-ink-500">Each section is edited in place on its own tab.</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PROFILE_TABS.filter((t) => t.key !== 'timeline').map((t) => (
                <Link key={t.key} href={t.href} className="rounded-lg border border-ink-200 px-3 py-2 text-sm font-semibold text-ink-700 hover:border-brand-300 hover:text-brand-700 dark:border-ink-700 dark:text-ink-200">
                  {t.label}
                </Link>
              ))}
            </div>
          </Card>
        )}
      </main>

      <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <Card className="p-5">
          <h3 className="font-display text-sm font-bold text-ink-900 dark:text-white">Profile completeness</h3>
          {hero.completenessScore != null ? (
            <>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                <div className="h-full rounded-full bg-brand-600" style={{ width: `${hero.completenessScore}%` }} />
              </div>
              <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{hero.completenessScore}% complete</p>
              {hero.completenessMissingSections.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-ink-400 dark:text-ink-500">
                  {hero.completenessMissingSections.map((s) => (
                    <li key={s} className="capitalize">• {s.replace(/_/g, ' ')}</li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-ink-400">Calculating…</p>
          )}
        </Card>
        <Card className="p-5">
          <h3 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink-900 dark:text-white">
            <Sparkles className="h-4 w-4 text-purple-500" /> Suggestions
          </h3>
          <p className="mt-2 text-sm text-ink-400 dark:text-ink-500">
            {hero.completenessMissingSections.length > 0
              ? `Complete "${hero.completenessMissingSections[0].replace(/_/g, ' ')}" next to strengthen your profile.`
              : 'Your profile covers all core sections.'}
          </p>
        </Card>
      </aside>
    </div>
  );
}
