'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Users, Ticket, Calendar, Timer } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';

type SessionDetail = {
  id: string;
  title: string;
  description: string | null;
  format: string;
  capacity: number;
  priceCents: number;
  startsAt: string;
  status: string;
  ticketsSold: number;
  checkedInCount: number;
};

const STATUS_TONE: Record<string, 'brand' | 'neutral' | 'success' | 'warning' | 'danger'> = {
  draft: 'neutral',
  published: 'brand',
  lobby_open: 'warning',
  live: 'success',
  ended: 'neutral',
  cancelled: 'danger',
};

const FORMAT_LABEL: Record<string, string> = {
  rapid_2m: '2-minute rounds',
  rapid_5m: '5-minute rounds',
  rapid_10m: '10-minute rounds',
  full_length: 'Full-length session',
};

/**
 * Host dashboard (Phase 1: status + roster counts only — lobby/start/end round-orchestration
 * actions land in Phase 3 once video/round infrastructure exists).
 */
export default function ManageSpeedNetworkingSessionPage() {
  const params = useParams<{ id: string }>();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<{ data: SessionDetail }>(`/speed-networking/sessions/${params.id}`);
      setSession(res.data.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load this session.'));
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <div className="mx-auto max-w-3xl rounded-panel border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>;
  if (!session) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">{session.title}</h1>
          <p className="mt-1 text-sm text-ink-500">{session.description || 'No description yet.'}</p>
        </div>
        <Badge tone={STATUS_TONE[session.status] || 'neutral'}>{session.status.replaceAll('_', ' ')}</Badge>
      </div>

      <KpiGrid className="sm:grid-cols-3">
        <KpiCard label="Tickets" value={session.ticketsSold} icon={Ticket} />
        <KpiCard label="Checked in" value={session.checkedInCount} icon={Users} />
        <KpiCard label="Capacity" value={session.capacity} />
      </KpiGrid>

      <div className="rounded-panel border border-ink-100 bg-white p-4 shadow-surface">
        <div className="flex items-center gap-2 text-sm text-ink-600">
          <Timer className="h-4 w-4 text-ink-400" /> {FORMAT_LABEL[session.format] || session.format}
        </div>
        <div className="mt-2 flex items-center gap-2 text-sm text-ink-600">
          <Calendar className="h-4 w-4 text-ink-400" /> {new Date(session.startsAt).toLocaleString()}
        </div>
      </div>

      {session.status === 'draft' && (
        <div className="rounded-panel border border-dashed border-ink-200 bg-white p-6 text-center text-sm text-ink-500">
          This session is still a draft.{' '}
          <a href={`/app/speed-networking/create?sessionId=${session.id}`} className="font-semibold text-brand-600 hover:text-brand-700">
            Continue setting it up
          </a>
          .
        </div>
      )}

      {session.status === 'published' && (
        <div className="rounded-panel border border-dashed border-ink-200 bg-white p-6 text-center text-sm text-ink-500">
          Published. Lobby check-in and round-start controls land in the next build phase.
        </div>
      )}
    </div>
  );
}
