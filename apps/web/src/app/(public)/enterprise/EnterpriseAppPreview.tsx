import { Sparkles, ShieldCheck } from 'lucide-react';

// Illustrative product-preview mock for the Enterprise marketing page —
// built from real divs/Tailwind tokens (not an image), non-interactive.
export function EnterpriseAppPreview() {
  return (
    <div className="w-full max-w-[720px] overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-floating">
      <div className="flex items-center gap-4 border-b border-ink-100 px-4 py-2.5">
        <span className="text-sm font-extrabold text-ink-900">Gigvora</span>
        <span className="rounded-md bg-ink-50 px-2 py-1 text-[11px] font-semibold text-ink-600">Acme Global ▾</span>
        <div className="ml-auto flex items-center gap-2 text-ink-400">
          <span className="h-5 w-5 rounded-full bg-ink-200" />
        </div>
      </div>

      <div className="grid grid-cols-[0.85fr_1.15fr] gap-3 p-3">
        <div className="rounded-xl border border-ink-100 p-3">
          <p className="text-[11px] font-bold text-ink-900">Good morning, Olivia 👋</p>
          <p className="text-[9px] text-ink-400">Here&rsquo;s what&rsquo;s happening across Acme Global.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              { label: 'Total Projects', value: '128', delta: '+12% vs last 30 days' },
              { label: 'Active People', value: '2,846', delta: '+8% vs last 30 days' },
              { label: 'Open Roles', value: '156', delta: '+19% vs last 30 days' },
              { label: 'Revenue', value: '$24.8M', delta: '+18% vs last 30 days' },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-lg border border-ink-100 p-2">
                <p className="text-[9px] text-ink-400">{kpi.label}</p>
                <p className="text-[12px] font-bold text-ink-900">{kpi.value}</p>
                <p className="text-[8px] font-semibold text-emerald-600">{kpi.delta}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="rounded-xl border border-ink-100 p-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-ink-700">Work overview</p>
              <span className="text-[9px] text-ink-400">by week</span>
            </div>
            <div className="mt-2 h-14 rounded-lg bg-gradient-to-t from-brand-50 to-white" />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-ink-100 p-2.5">
              <p className="flex items-center gap-1 text-[9px] font-semibold text-brand-600">
                <Sparkles className="h-3 w-3" /> AI insights
              </p>
              <p className="mt-1 text-[9px] text-ink-500">High-fit candidates increased by 32% via AI matching.</p>
            </div>
            <div className="rounded-xl border border-ink-100 p-2.5">
              <p className="flex items-center gap-1 text-[9px] font-semibold text-emerald-600">
                <ShieldCheck className="h-3 w-3" /> Security posture
              </p>
              <p className="mt-1 text-[9px] text-ink-500">SSO enabled · MFA enforced · Audit logging on</p>
            </div>
          </div>
        </div>
      </div>

      <div aria-hidden className="px-4 pb-3 text-[9px] text-ink-300">
        Live product preview — illustrative
      </div>
    </div>
  );
}
