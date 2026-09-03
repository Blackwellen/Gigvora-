'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Flag, Loader2, MessageSquarePlus } from 'lucide-react';
import { ProfessionalProfileShell } from '@/components/profile/ProfessionalProfileShell';
import { ProfileEmptyState } from '@/components/profile/ProfileEmptyState';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api, getApiErrorMessage } from '@/lib/api';

type Recommendation = {
  id: string;
  body: string;
  relationship_type: string | null;
  visibility: string;
  verification_status: string;
  status: string;
  created_at: string;
  author: { id: string; first_name: string; last_name: string; headline: string | null } | null;
  endorsedSkills: Array<{ id: string; canonical_name: string }>;
};

const KEY = ['professional-profile', 'recommendations'];

export default function RecommendationsPage() {
  const queryClient = useQueryClient();
  const [showRequest, setShowRequest] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: KEY, queryFn: async () => (await api.get<{ data: Recommendation[] }>('/professional-profile/me/recommendations')).data.data });

  const report = useMutation({
    mutationFn: (id: string) => api.post(`/professional-profile/me/recommendations/${id}/report`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });

  const published = (data || []).filter((r) => r.status === 'published');
  const pending = (data || []).filter((r) => r.status === 'pending');

  return (
    <ProfessionalProfileShell active="recommendations">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-ink-900 dark:text-white">Recommendations</h2>
          {!showRequest && (
            <Button type="button" size="sm" onClick={() => setShowRequest(true)}>
              <MessageSquarePlus className="h-4 w-4" /> Request recommendation
            </Button>
          )}
        </div>

        {showRequest && <RequestForm onClose={() => setShowRequest(false)} />}

        {isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        )}

        {!isLoading && published.length === 0 && pending.length === 0 && !showRequest && (
          <ProfileEmptyState title="No recommendations yet" body="Request a recommendation from a manager, client or colleague." actionLabel="Request recommendation" onAction={() => setShowRequest(true)} />
        )}

        {pending.length > 0 && (
          <div className="rounded-panel border border-dashed border-ink-200 bg-white p-4 text-sm text-ink-500 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-400">
            {pending.length} recommendation request{pending.length === 1 ? '' : 's'} pending a response.
          </div>
        )}

        <div className="space-y-3">
          {published.map((rec) => (
            <Card key={rec.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink-900 dark:text-white">
                    {rec.author ? `${rec.author.first_name} ${rec.author.last_name}` : 'Former colleague'}
                  </p>
                  {rec.author?.headline && <p className="text-xs text-ink-400 dark:text-ink-500">{rec.author.headline}</p>}
                  {rec.relationship_type && <p className="text-xs text-ink-400 dark:text-ink-500">{rec.relationship_type.replace(/_/g, ' ')}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {rec.verification_status === 'relationship_verified' && <Badge tone="success">Verified relationship</Badge>}
                  <Button type="button" size="icon" variant="ghost" aria-label="Report" onClick={() => report.mutate(rec.id)}>
                    <Flag className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">{rec.body}</p>
              {rec.endorsedSkills.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {rec.endorsedSkills.map((s) => (
                    <Badge key={s.id} tone="neutral">
                      {s.canonical_name}
                    </Badge>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </ProfessionalProfileShell>
  );
}

function RequestForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [requestedPersonId, setRequestedPersonId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.post('/professional-profile/me/recommendations/request', { requestedPersonId, message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
      onClose();
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  return (
    <Card className="p-5">
      <p className="text-sm text-ink-500 dark:text-ink-400">Enter the user ID of the person you&rsquo;d like to request a recommendation from.</p>
      <Input className="mt-2" placeholder="Person's user ID" value={requestedPersonId} onChange={(e) => setRequestedPersonId(e.target.value)} />
      <textarea
        placeholder="Add a personal note (optional)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        className="mt-3 w-full rounded-control border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
      />
      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
      <div className="mt-4 flex items-center gap-2">
        <Button type="button" size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending || !requestedPersonId}>
          {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Send request
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
