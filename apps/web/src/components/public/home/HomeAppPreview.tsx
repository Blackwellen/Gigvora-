import { MessageSquare, Bell, LayoutGrid, Search, Plus, ThumbsUp, MessageCircle, Share2, Bookmark } from 'lucide-react';

// Controlled, non-clickable product-preview built from the same design
// tokens as the live app shell — illustrates the authenticated experience
// on the marketing site without embedding (or faking) real app state.
export function HomeAppPreview() {
  return (
    <div aria-hidden="true" className="w-full max-w-[720px] overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-floating">
      <div className="flex items-center gap-4 border-b border-ink-100 px-4 py-2.5">
        <span className="text-sm font-extrabold text-ink-900">Gigvora</span>
        <span className="rounded-md bg-ink-50 px-2 py-1 text-[11px] font-semibold text-ink-600">Acme Workspace ▾</span>
        <div className="ml-2 hidden flex-1 items-center gap-4 text-[11px] font-semibold text-ink-400 sm:flex">
          <span className="text-brand-600">Live Feed</span>
          <span>Network</span>
          <span>Projects</span>
          <span>Gigs</span>
          <span>Jobs</span>
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

      <div className="grid grid-cols-[0.9fr_1.4fr_1fr] gap-3 p-3">
        <div className="rounded-xl border border-ink-100 p-3">
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-full bg-brand-100" />
            <div>
              <p className="text-[11px] font-bold text-ink-900">Olivia Bennett</p>
              <p className="text-[10px] text-ink-400">Product Strategy Lead</p>
            </div>
          </div>
          <div className="mt-3 flex justify-between text-center text-[10px] text-ink-500">
            <span>
              <b className="block text-ink-900">1,248</b>Connections
            </span>
            <span>
              <b className="block text-ink-900">3,642</b>Followers
            </span>
          </div>
          <div className="mt-3 space-y-1.5 border-t border-ink-100 pt-2 text-[10px] text-ink-500">
            <p className="font-semibold text-ink-700">Shortcuts</p>
            <p>My Projects</p>
            <p>Gigs</p>
            <p>Jobs</p>
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="rounded-xl border border-ink-100 p-2.5">
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-ink-100" />
              <span className="flex-1 rounded-full bg-ink-50 px-3 py-1.5 text-[10px] text-ink-300">
                Share an update, insight, or opportunity...
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-ink-100 p-2.5">
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-brand-100" />
              <div>
                <p className="text-[11px] font-bold text-ink-900">Acme Corporation</p>
                <p className="text-[9px] text-ink-400">12,345 followers</p>
              </div>
            </div>
            <p className="mt-2 text-[10px] leading-snug text-ink-600">
              We&rsquo;re excited to share our Q2 roadmap and new AI-powered analytics suite — designed to help teams move
              faster and make smarter decisions.
            </p>
            <div className="mt-2 h-16 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700" />
            <div className="mt-2 flex items-center gap-3 text-[10px] text-ink-400">
              <ThumbsUp className="h-3 w-3" /> <MessageCircle className="h-3 w-3" /> <Share2 className="h-3 w-3" />{' '}
              <Bookmark className="h-3 w-3" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-ink-100 p-3">
          <p className="text-[10px] font-semibold text-ink-700">Recommended for you</p>
          <div className="mt-2 space-y-2.5">
            {['Ethan Brooks', 'Priya Nair', 'James Carter'].map((name) => (
              <div key={name} className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-ink-100" />
                <p className="flex-1 text-[10px] font-semibold text-ink-800">{name}</p>
                <span className="rounded-md border border-ink-200 px-1.5 py-0.5 text-[9px] font-semibold text-ink-500">
                  Connect
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 border-t border-ink-100 pt-2 text-[10px] font-semibold text-ink-700">Trending Gigs</p>
          <div className="mt-1.5 space-y-1.5 text-[9px] text-ink-500">
            <p>Senior Product Manager · Remote</p>
            <p>AI/ML Product Lead · Contract</p>
          </div>
        </div>
      </div>

      <div aria-hidden className="flex items-center gap-1.5 px-4 pb-3 text-[9px] text-ink-300">
        <LayoutGrid className="h-3 w-3" /> Live product preview — illustrative
      </div>
    </div>
  );
}
