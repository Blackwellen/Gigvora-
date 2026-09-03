'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Loader2, Plus, Trash2 } from 'lucide-react';
import { ProfessionalProfileShell } from '@/components/profile/ProfessionalProfileShell';
import { ProfileRightRailCard } from '@/components/profile/ProfileRightRailCard';
import { ProfileEmptyState } from '@/components/profile/ProfileEmptyState';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api, getApiErrorMessage } from '@/lib/api';

type ServicePackage = { id: string; name: string; price_cents: number; currency: string; delivery_days: number | null };
type Service = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  rate_type: string;
  starting_price_cents: number | null;
  currency: string;
  availability_status: string;
  packages: ServicePackage[];
};

const KEY = ['professional-profile', 'services'];

function money(cents: number | null, currency: string) {
  if (cents == null) return null;
  return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(cents / 100);
}

export default function ServicesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: KEY, queryFn: async () => (await api.get<{ data: Service[] }>('/professional-profile/me/services')).data.data });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/professional-profile/me/services/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });

  return (
    <ProfessionalProfileShell
      active="services"
      rightRail={
        <ProfileRightRailCard title="Pricing guidance" beta>
          <p className="text-sm text-ink-400 dark:text-ink-500">
            Insufficient marketplace benchmark data for your category yet — pricing guidance will appear once enough comparable services exist.
          </p>
        </ProfileRightRailCard>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink-900 dark:text-white">
            <Briefcase className="h-4 w-4" /> Services
          </h2>
          {!showForm && (
            <Button type="button" size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> Add service
            </Button>
          )}
        </div>

        {showForm && <ServiceForm onClose={() => setShowForm(false)} />}

        {isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        )}

        {!isLoading && (data || []).length === 0 && !showForm && (
          <ProfileEmptyState title="Create your first service" body="Package your expertise into a service clients can book." actionLabel="Add service" onAction={() => setShowForm(true)} />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(data || []).map((svc) => (
            <Card key={svc.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink-900 dark:text-white">{svc.title}</p>
                  {svc.category && <p className="text-xs text-ink-400 dark:text-ink-500">{svc.category}</p>}
                </div>
                <Button type="button" size="icon" variant="ghost" aria-label="Delete" onClick={() => remove.mutate(svc.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              {svc.description && <p className="mt-2 line-clamp-2 text-sm text-ink-500 dark:text-ink-400">{svc.description}</p>}
              <div className="mt-2 flex items-center gap-2">
                <Badge tone={svc.availability_status === 'available' ? 'success' : 'neutral'} className="capitalize">
                  {svc.availability_status.replace('_', ' ')}
                </Badge>
                {svc.starting_price_cents != null && (
                  <span className="text-sm font-semibold text-ink-800 dark:text-ink-100">
                    From {money(svc.starting_price_cents, svc.currency)} / {svc.rate_type}
                  </span>
                )}
              </div>
              {svc.packages.length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-ink-100 pt-2 dark:border-ink-800">
                  {svc.packages.map((pkg) => (
                    <div key={pkg.id} className="flex items-center justify-between text-xs text-ink-500 dark:text-ink-400">
                      <span>{pkg.name}</span>
                      <span className="font-semibold text-ink-800 dark:text-ink-100">{money(pkg.price_cents, pkg.currency)}</span>
                    </div>
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

function ServiceForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [startingPrice, setStartingPrice] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/professional-profile/me/services', {
        title,
        category,
        description,
        startingPriceCents: startingPrice ? Math.round(Number(startingPrice) * 100) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
      onClose();
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  return (
    <Card className="p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input placeholder="Service title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
        <Input placeholder="Starting price (USD)" type="number" value={startingPrice} onChange={(e) => setStartingPrice(e.target.value)} />
      </div>
      <textarea
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        className="mt-3 w-full rounded-control border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
      />
      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
      <div className="mt-4 flex items-center gap-2">
        <Button type="button" size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending || !title}>
          {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
