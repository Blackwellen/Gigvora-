'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Grid2x2, List, Loader2, Plus, Star, Trash2, Upload } from 'lucide-react';
import { ProfessionalProfileShell } from '@/components/profile/ProfessionalProfileShell';
import { ProfileEmptyState } from '@/components/profile/ProfileEmptyState';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api, getApiErrorMessage } from '@/lib/api';

type PortfolioItem = {
  id: string;
  title: string;
  summary: string | null;
  portfolio_type: string;
  role: string | null;
  featured: boolean;
  status: string;
  assets: Array<{ id: string; url: string; asset_type: string }>;
};

const KEY = ['professional-profile', 'portfolio'];

export default function PortfolioPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: KEY, queryFn: async () => (await api.get<{ data: PortfolioItem[] }>('/professional-profile/me/portfolio')).data.data });

  const toggleFeatured = useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) => api.patch(`/professional-profile/me/portfolio/${id}`, { featured }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/professional-profile/me/portfolio/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });

  return (
    <ProfessionalProfileShell active="portfolio">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-ink-900 dark:text-white">Portfolio</h2>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-ink-200 dark:border-ink-700">
              <button type="button" onClick={() => setView('grid')} aria-label="Grid view" className={`p-1.5 ${view === 'grid' ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15' : 'text-ink-400'}`}>
                <Grid2x2 className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setView('list')} aria-label="List view" className={`p-1.5 ${view === 'list' ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15' : 'text-ink-400'}`}>
                <List className="h-4 w-4" />
              </button>
            </div>
            {!showForm && (
              <Button type="button" size="sm" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4" /> Add item
              </Button>
            )}
          </div>
        </div>

        {showForm && <PortfolioForm onClose={() => setShowForm(false)} />}

        {isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        )}

        {!isLoading && (data || []).length === 0 && !showForm && (
          <ProfileEmptyState title="Showcase your best work" body="Add case studies, designs or projects that demonstrate your craft." actionLabel="Add your first item" onAction={() => setShowForm(true)} />
        )}

        <div className={view === 'grid' ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-3'}>
          {(data || []).map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <div className="h-36 bg-ink-100 dark:bg-ink-800">
                {item.assets[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.assets[0].url} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink-900 dark:text-white">{item.title}</p>
                    {item.role && <p className="text-xs text-ink-400 dark:text-ink-500">{item.role}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button type="button" size="icon" variant="ghost" aria-label="Feature" onClick={() => toggleFeatured.mutate({ id: item.id, featured: !item.featured })}>
                      <Star className={`h-3.5 w-3.5 ${item.featured ? 'fill-amber-400 text-amber-400' : 'text-ink-300'}`} />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" aria-label="Delete" onClick={() => remove.mutate(item.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {item.summary && <p className="mt-1 line-clamp-2 text-sm text-ink-500 dark:text-ink-400">{item.summary}</p>}
                <div className="mt-2 flex items-center gap-2">
                  <Badge tone="neutral" className="capitalize">{item.portfolio_type.replace('_', ' ')}</Badge>
                  {item.status !== 'published' && <Badge tone="warning">{item.status}</Badge>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </ProfessionalProfileShell>
  );
}

function PortfolioForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [role, setRole] = useState('');
  const [asset, setAsset] = useState<{ assetKey: string; url: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/professional-profile/me/portfolio/assets', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setAsset({ assetKey: data.data.key, url: data.data.url });
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't upload file."));
    } finally {
      setUploading(false);
    }
  }

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/professional-profile/me/portfolio', {
        title,
        summary,
        role,
        assets: asset ? [{ assetKey: asset.assetKey, url: asset.url, assetType: 'image' }] : [],
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
        <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input placeholder="Your role" value={role} onChange={(e) => setRole(e.target.value)} />
      </div>
      <textarea
        placeholder="Summary"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        rows={3}
        className="mt-3 w-full rounded-control border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
      />
      <div className="mt-3">
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {asset ? 'Change image' : 'Upload image'}
        </Button>
        {asset && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset.url} alt="" className="mt-2 h-24 w-24 rounded-lg object-cover" />
        )}
      </div>
      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
      <div className="mt-4 flex items-center gap-2">
        <Button type="button" size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending || !title}>
          {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Publish
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
