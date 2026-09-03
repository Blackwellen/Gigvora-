import { Users, Building2, Tag, Briefcase, Globe2, Heart, type LucideIcon } from 'lucide-react';
import type { TrustMetric } from '@/lib/publicContent';

const ICONS: Record<string, LucideIcon> = {
  professionals: Users,
  companies: Building2,
  gigs_posted: Tag,
  gigs_posted_monthly: Tag,
  jobs_posted: Briefcase,
  jobs_posted_monthly: Briefcase,
  countries: Globe2,
  satisfaction_rate: Heart,
};

export function MetricsRow({ metrics }: { metrics: Record<string, TrustMetric> }) {
  const entries = Object.entries(metrics);
  if (entries.length === 0) return null;

  return (
    <div className="rounded-2xl border border-ink-100 bg-white px-6 py-6 shadow-surface">
      <div className="flex flex-wrap gap-y-4">
        {entries.map(([key, metric], i) => {
          const Icon = ICONS[key] || Users;
          return (
            <div
              key={key}
              className="flex flex-1 basis-1/2 items-center gap-3 border-ink-100 pl-0 sm:basis-0 sm:border-l sm:pl-6 sm:first:border-l-0 sm:first:pl-0"
              style={i === 0 ? undefined : { marginLeft: 0 }}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-lg font-extrabold text-ink-900">{metric.value}</p>
                <p className="text-xs text-ink-500">{metric.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
