import { Search, Bell, MessageSquare, Plus } from 'lucide-react';

// Illustrative product-preview mock for the For Professionals marketing page —
// built from real divs/Tailwind tokens (not an image), non-interactive.
export function ForProAppPreview() {
  return (
    <div className="w-full max-w-[680px] overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-floating">
      <div className="flex items-center gap-4 border-b border-ink-100 px-4 py-2.5">
        <span className="text-sm font-extrabold text-ink-900">Gigvora</span>
        <span className="rounded-md bg-ink-50 px-2 py-1 text-[11px] font-semibold text-ink-600">Acme Workspace ▾</span>
        <div className="ml-2 hidden flex-1 items-center gap-4 text-[11px] font-semibold text-ink-400 sm:flex">
          <span className="text-brand-600">Live Feed</span>
          <span>Network</span>
          <span>Projects</span>
          <span>Gigs</span>
          <span>Experience</span>
        </div>
        <div className="ml-auto flex items-center gap-2 text-ink-400">
          <Bell className="h-3.5 w-3.5" />
          <MessageSquare className="h-3.5 w-3.5" />
          <span className="h-5 w-5 rounded-full bg-ink-200" />
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-ink-100 px-4 py-2">
        <Search className="h-3.5 w-3.5 text-ink-300" />
        <span className="text-[11px] text-ink-300">Search people, companies, gigs, jobs, and more...</span>
        <span className="ml-auto flex items-center gap-1 rounded-md bg-brand-600 px-2 py-1 text-[10px] font-semibold text-white">
          <Plus className="h-3 w-3" /> Create
        </span>
      </div>

      <div className="grid grid-cols-[0.85fr_1.15fr] gap-3 p-3">
        <div className="rounded-xl border border-ink-100 p-3">
          <div className="flex items-center gap-2">
            <span className="h-9 w-9 rounded-full bg-brand-100" />
            <div>
              <p className="text-[11px] font-bold text-ink-900">Marcus Lee</p>
              <p className="text-[10px] text-ink-400">Product Designer</p>
              <p className="text-[9px] text-ink-300">San Francisco, CA</p>
            </div>
          </div>
          <div className="mt-3 flex justify-between text-center text-[10px] text-ink-500">
            <span>
              <b className="block text-ink-900">1,248</b>Profile views
            </span>
            <span>
              <b className="block text-ink-900">3,642</b>Connections
            </span>
            <span>
              <b className="block text-ink-900">896</b>Endorsements
            </span>
          </div>
          <div className="mt-3 border-t border-ink-100 pt-2.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-semibold text-ink-700">Profile strength</span>
              <span className="font-bold text-brand-600">92%</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-ink-100">
              <div className="h-1.5 w-[92%] rounded-full bg-brand-600" />
            </div>
          </div>
          <div className="mt-3 border-t border-ink-100 pt-2 text-[10px] text-ink-500">
            <p className="font-semibold text-emerald-600">● Open to work</p>
            <p className="mt-0.5 text-ink-400">Full-time · Remote</p>
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-ink-100 p-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-ink-700">Discover opportunities</p>
            <span className="text-[9px] font-semibold text-brand-600">View all</span>
          </div>
          {[
            { title: 'Senior Product Designer', meta: 'Acme Corporation · Full-time · Remote', tag: 'High match' },
            { title: 'UX/UI Design Consultant', meta: 'Brightside · Remote · Contract', tag: 'New' },
            { title: 'Design Systems Specialist', meta: 'Nebula Labs · Remote · Full-time', tag: 'High match' },
          ].map((role) => (
            <div key={role.title} className="flex items-center gap-2 rounded-lg border border-ink-100 p-2">
              <span className="h-7 w-7 shrink-0 rounded-md bg-ink-100" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-semibold text-ink-900">{role.title}</p>
                <p className="truncate text-[9px] text-ink-400">{role.meta}</p>
              </div>
              <span className="shrink-0 rounded-md bg-brand-50 px-1.5 py-0.5 text-[8px] font-semibold text-brand-600">
                {role.tag}
              </span>
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
