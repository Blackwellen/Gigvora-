import { Search, Bell, MessageSquare, Plus, ThumbsUp, MessageCircle, Share2 } from 'lucide-react';

// Illustrative product-preview mock for the About page — built from real
// divs/Tailwind tokens (not an image), non-interactive.
export function AboutAppPreview() {
  return (
    <div className="w-full max-w-[680px] overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-floating">
      <div className="flex items-center gap-4 border-b border-ink-100 px-4 py-2.5">
        <span className="text-sm font-extrabold text-ink-900">Gigvora</span>
        <div className="ml-2 hidden flex-1 items-center gap-2 rounded-full bg-ink-50 px-3 py-1.5 text-[11px] text-ink-300 sm:flex">
          <Search className="h-3 w-3" /> Search people, companies, gigs, jobs, and more...
        </div>
        <div className="ml-auto flex items-center gap-2 text-ink-400">
          <Plus className="h-3.5 w-3.5" />
          <Bell className="h-3.5 w-3.5" />
          <MessageSquare className="h-3.5 w-3.5" />
          <span className="h-5 w-5 rounded-full bg-ink-200" />
        </div>
      </div>

      <div className="grid grid-cols-[0.85fr_1.15fr] gap-3 p-3">
        <div className="rounded-xl border border-ink-100 p-3">
          <div className="flex items-center gap-2">
            <span className="h-9 w-9 rounded-full bg-brand-100" />
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
            <p>My Projects · 4</p>
            <p>Gigs · 6</p>
            <p>Jobs · 8</p>
          </div>
        </div>

        <div className="rounded-xl border border-ink-100 p-2.5">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-ink-100" />
            <span className="flex-1 rounded-full bg-ink-50 px-3 py-1.5 text-[10px] text-ink-300">
              Share an update, insight, or opportunity...
            </span>
          </div>
          <div className="mt-2.5 border-t border-ink-100 pt-2.5">
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-brand-100" />
              <div>
                <p className="text-[11px] font-bold text-ink-900">Acme Corporation</p>
                <p className="text-[9px] text-ink-400">12,345 followers</p>
              </div>
            </div>
            <p className="mt-2 text-[10px] leading-snug text-ink-600">
              We&rsquo;re excited to share our Q2 roadmap and new AI-powered analytics suite.
            </p>
            <div className="mt-2 h-14 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700" />
            <div className="mt-2 flex items-center gap-3 text-[10px] text-ink-400">
              <ThumbsUp className="h-3 w-3" /> <MessageCircle className="h-3 w-3" /> <Share2 className="h-3 w-3" />
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
