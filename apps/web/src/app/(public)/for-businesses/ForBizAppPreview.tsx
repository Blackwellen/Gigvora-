import { Search, Bell, MessageSquare, Plus } from 'lucide-react';

// Illustrative product-preview mock for the For Businesses marketing page —
// built from real divs/Tailwind tokens (not an image), non-interactive.
export function ForBizAppPreview() {
  return (
    <div className="w-full max-w-[680px] overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-floating">
      <div className="flex items-center gap-4 border-b border-ink-100 px-4 py-2.5">
        <span className="text-sm font-extrabold text-ink-900">Gigvora</span>
        <span className="rounded-md bg-ink-50 px-2 py-1 text-[11px] font-semibold text-ink-600">Acme Corporation ▾</span>
        <div className="ml-2 hidden flex-1 items-center gap-4 text-[11px] font-semibold text-ink-400 sm:flex">
          <span className="text-brand-600">Home</span>
          <span>Network</span>
          <span>Projects</span>
          <span>Gigs</span>
          <span>Analytics</span>
        </div>
        <div className="ml-auto flex items-center gap-2 text-ink-400">
          <Bell className="h-3.5 w-3.5" />
          <MessageSquare className="h-3.5 w-3.5" />
          <span className="h-5 w-5 rounded-full bg-ink-200" />
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-ink-100 px-4 py-2">
        <Search className="h-3.5 w-3.5 text-ink-300" />
        <span className="text-[11px] text-ink-300">Search talent, gigs, projects, or skills...</span>
        <span className="ml-auto flex items-center gap-1 rounded-md bg-brand-600 px-2 py-1 text-[10px] font-semibold text-white">
          <Plus className="h-3 w-3" /> Create
        </span>
      </div>

      <div className="grid grid-cols-[1fr_0.85fr] gap-3 p-3">
        <div className="rounded-xl border border-ink-100 p-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-ink-700">Find talent</p>
            <span className="text-[9px] font-semibold text-brand-600">Recommended for you</span>
          </div>
          {[
            { name: 'Marcus Lee', role: 'Senior Product Designer', rate: '$80/hr' },
            { name: 'Priya Nair', role: 'AI/ML Engineer', rate: '$110/hr' },
            { name: 'James Carter', role: 'Full-Stack Developer', rate: '$75/hr' },
          ].map((p) => (
            <div key={p.name} className="mt-2 flex items-center gap-2 rounded-lg border border-ink-100 p-2">
              <span className="h-7 w-7 shrink-0 rounded-full bg-brand-100" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-semibold text-ink-900">{p.name}</p>
                <p className="truncate text-[9px] text-ink-400">{p.role}</p>
              </div>
              <span className="shrink-0 text-[9px] font-semibold text-ink-600">{p.rate}</span>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-ink-100 p-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-ink-700">Recent projects</p>
            <span className="text-[9px] font-semibold text-brand-600">View all</span>
          </div>
          {[
            { title: 'AI Analytics Dashboard', status: 'In progress', pct: 68 },
            { title: 'Mobile App Redesign', status: 'In progress', pct: 42 },
            { title: 'Data Pipeline Automation', status: 'Planning', pct: 12 },
          ].map((proj) => (
            <div key={proj.title} className="mt-2 rounded-lg border border-ink-100 p-2">
              <p className="truncate text-[10px] font-semibold text-ink-900">{proj.title}</p>
              <p className="text-[9px] text-ink-400">{proj.status}</p>
              <div className="mt-1.5 h-1 w-full rounded-full bg-ink-100">
                <div className="h-1 rounded-full bg-brand-600" style={{ width: `${proj.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div aria-hidden className="px-4 pb-3 text-[9px] text-ink-300">
        Live product preview — illustrative
      </div>
    </div>
  );
}
