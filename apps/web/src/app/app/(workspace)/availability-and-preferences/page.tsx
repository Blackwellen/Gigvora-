'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Check, Loader2 } from 'lucide-react';
import { ProfessionalProfileShell } from '@/components/profile/ProfessionalProfileShell';
import { ProfileRightRailCard } from '@/components/profile/ProfileRightRailCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api, getApiErrorMessage } from '@/lib/api';

type Availability = {
  exists: boolean;
  availability_status?: string;
  weekly_capacity_hours?: number | null;
  notice_period?: string | null;
  work_location_modes?: string[];
  preferred_locations?: string[];
  minimum_rate_cents?: number | null;
  maximum_rate_cents?: number | null;
  currency?: string;
  rate_unit?: string;
  timezone?: string | null;
  travel_willing?: boolean;
};
type MatchReadiness = { score: number; factors: Array<{ label: string; met: boolean; detail?: string }> };

const LOCATION_MODES = ['remote', 'hybrid', 'onsite'];
const STATUS_OPTIONS = [
  { value: 'open_to_work', label: 'Open to work' },
  { value: 'open_to_projects', label: 'Available for projects' },
  { value: 'not_available', label: 'Not available' },
  { value: 'unspecified', label: 'Unspecified' },
];

export default function AvailabilityPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ['professional-profile', 'availability'], queryFn: async () => (await api.get<{ data: Availability }>('/professional-profile/me/availability')).data.data });
  const { data: readiness } = useQuery({
    queryKey: ['professional-profile', 'match-readiness'],
    queryFn: async () => (await api.get<{ data: MatchReadiness }>('/professional-profile/me/match-readiness')).data.data,
  });

  const [status, setStatus] = useState('unspecified');
  const [weeklyHours, setWeeklyHours] = useState('');
  const [noticePeriod, setNoticePeriod] = useState('');
  const [locationModes, setLocationModes] = useState<string[]>([]);
  const [minRate, setMinRate] = useState('');
  const [maxRate, setMaxRate] = useState('');
  const [timezone, setTimezone] = useState('');
  const [travelWilling, setTravelWilling] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setStatus(data.availability_status || 'unspecified');
    setWeeklyHours(data.weekly_capacity_hours ? String(data.weekly_capacity_hours) : '');
    setNoticePeriod(data.notice_period || '');
    setLocationModes(data.work_location_modes || []);
    setMinRate(data.minimum_rate_cents ? String(data.minimum_rate_cents / 100) : '');
    setMaxRate(data.maximum_rate_cents ? String(data.maximum_rate_cents / 100) : '');
    setTimezone(data.timezone || '');
    setTravelWilling(Boolean(data.travel_willing));
  }, [data]);

  const mutation = useMutation({
    mutationFn: () =>
      api.put('/professional-profile/me/availability', {
        availabilityStatus: status,
        weeklyCapacityHours: weeklyHours ? Number(weeklyHours) : undefined,
        noticePeriod,
        workLocationModes: locationModes,
        minimumRateCents: minRate ? Math.round(Number(minRate) * 100) : undefined,
        maximumRateCents: maxRate ? Math.round(Number(maxRate) * 100) : undefined,
        timezone,
        travelWilling,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professional-profile', 'availability'] });
      queryClient.invalidateQueries({ queryKey: ['professional-profile', 'hero'] });
      queryClient.invalidateQueries({ queryKey: ['professional-profile', 'match-readiness'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  function toggleMode(mode: string) {
    setLocationModes((prev) => (prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode]));
  }

  return (
    <ProfessionalProfileShell
      active="availability-and-preferences"
      rightRail={
        <ProfileRightRailCard title="Match readiness" beta>
          {readiness ? (
            <div>
              <p className="font-display text-2xl font-bold text-ink-900 dark:text-white">{readiness.score}%</p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {readiness.factors.map((f) => (
                  <li key={f.label} className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${f.met ? 'bg-emerald-500' : 'bg-ink-300'}`} />
                    <span className="text-ink-600 dark:text-ink-300">{f.label}</span>
                    {f.detail && <span className="text-xs text-ink-400">({f.detail})</span>}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-ink-400 dark:text-ink-500">This is a readiness signal, not an employment guarantee.</p>
            </div>
          ) : (
            <p className="text-sm text-ink-400 dark:text-ink-500">Loading…</p>
          )}
        </ProfileRightRailCard>
      }
    >
      <Card className="space-y-5 p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink-900 dark:text-white">
            <CalendarClock className="h-4 w-4" /> Availability & Preferences
          </h2>
          {saved && (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <Check className="h-3.5 w-3.5" /> Saved
            </span>
          )}
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">Availability status</p>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatus(opt.value)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${status === opt.value ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">Weekly capacity (hours)</p>
            <Input type="number" value={weeklyHours} onChange={(e) => setWeeklyHours(e.target.value)} />
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">Notice period</p>
            <Input value={noticePeriod} onChange={(e) => setNoticePeriod(e.target.value)} placeholder="e.g. 2 weeks" />
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">Minimum rate (USD)</p>
            <Input type="number" value={minRate} onChange={(e) => setMinRate(e.target.value)} />
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">Maximum rate (USD)</p>
            <Input type="number" value={maxRate} onChange={(e) => setMaxRate(e.target.value)} />
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">Timezone</p>
            <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="e.g. America/Los_Angeles" />
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">Work location modes</p>
          <div className="flex flex-wrap gap-2">
            {LOCATION_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => toggleMode(mode)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold capitalize ${locationModes.includes(mode) ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'}`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink-600 dark:text-ink-300">
          <input type="checkbox" checked={travelWilling} onChange={(e) => setTravelWilling(e.target.checked)} /> Willing to travel
        </label>

        <p className="text-xs text-ink-400 dark:text-ink-500">
          Exact rate is private by default — visitors see only your public availability status unless you widen visibility.
        </p>

        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
        <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save preferences
        </Button>
      </Card>
    </ProfessionalProfileShell>
  );
}
