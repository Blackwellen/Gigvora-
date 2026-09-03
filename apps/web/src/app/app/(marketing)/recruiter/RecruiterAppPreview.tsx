import { Search, Filter, Sparkles, Send, Mail, MessageSquare } from 'lucide-react';

// Illustrative, non-clickable mock of the Recruiter product surface — built
// from real Tailwind markup (not a screenshot) so it renders crisply at any
// size and matches the live design tokens.
export function RecruiterAppPreview() {
  const candidates = [
    { name: 'Priya Nair', role: 'Senior Frontend Engineer', loc: 'San Francisco, CA · 5 yrs', match: 92, active: true },
    { name: 'Marcus Lee', role: 'Full Stack Engineer', loc: 'Remote · 6 yrs', match: 89 },
    { name: 'Sophia Patel', role: 'Software Engineer', loc: 'New York, NY · 4 yrs', match: 87 },
    { name: 'Ethan Brooks', role: 'Frontend Engineer', loc: 'Austin, TX · 3 yrs', match: 84 },
  ];

  const funnel = [
    { stage: 'Applied', value: 1248 },
    { stage: 'Screen', value: 842 },
    { stage: 'Interview', value: 238 },
    { stage: 'Offer', value: 46 },
    { stage: 'Hired', value: 19 },
  ];
  const max = funnel[0].value;

  return (
    <div className="w-full max-w-[760px] overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-floating">
      <div className="flex items-center gap-3 border-b border-ink-100 px-4 py-2.5">
        <span className="text-sm font-extrabold text-ink-900">Gigvora</span>
        <span className="rounded-md bg-ink-50 px-2 py-1 text-[11px] font-semibold text-ink-600">Acme Corp ▾</span>
        <div className="ml-2 hidden flex-1 items-center gap-4 text-[11px] font-semibold text-ink-400 sm:flex">
          <span>Live Feed</span>
          <span>Network</span>
          <span>Projects</span>
          <span className="text-brand-600">Candidates</span>
          <span>Pipeline</span>
        </div>
        <span className="ml-auto h-5 w-5 rounded-full bg-ink-200" />
      </div>

      <div className="grid grid-cols-[0.85fr_1fr_0.9fr] gap-3 p-3">
        {/* Search / filters */}
        <div className="rounded-xl border border-ink-100 p-3">
          <div className="flex items-center gap-1.5 rounded-md border border-ink-100 px-2 py-1.5 text-[10px] text-ink-400">
            <Search className="h-3 w-3" /> Search by skills, title...
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px] font-semibold text-ink-700">
            <span className="flex items-center gap-1">
              <Filter className="h-3 w-3" /> Filters
            </span>
            <span className="text-brand-600">Clear all</span>
          </div>
          <div className="mt-2 space-y-2 text-[9px] text-ink-500">
            <p className="font-semibold text-ink-700">Location</p>
            <p className="rounded-md border border-ink-100 px-2 py-1">San Francisco, CA</p>
            <p className="font-semibold text-ink-700">Skills</p>
            <div className="flex flex-wrap gap-1">
              {['React', 'TypeScript', 'Node.js'].map((s) => (
                <span key={s} className="rounded-full bg-ink-50 px-1.5 py-0.5">
                  {s}
                </span>
              ))}
            </div>
            <p className="font-semibold text-ink-700">Employment type</p>
            <p>☑ Full-time &nbsp; ☐ Contract</p>
          </div>
        </div>

        {/* Candidate list */}
        <div className="rounded-xl border border-ink-100 p-2.5">
          <div className="mb-2 flex items-center justify-between text-[10px] font-semibold text-ink-700">
            <span>1,248 candidates</span>
            <span className="flex items-center gap-1 text-brand-600">
              <Sparkles className="h-3 w-3" /> Best match
            </span>
          </div>
          <div className="space-y-1.5">
            {candidates.map((c) => (
              <div
                key={c.name}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${c.active ? 'bg-brand-50' : ''}`}
              >
                <span className="h-6 w-6 rounded-full bg-ink-100" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px] font-bold text-ink-900">{c.name}</p>
                  <p className="truncate text-[9px] text-ink-400">{c.role}</p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                  {c.match}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Detail + outreach composer */}
        <div className="rounded-xl border border-ink-100 p-2.5">
          <div className="flex items-center gap-2">
            <span className="h-7 w-7 rounded-full bg-brand-100" />
            <div>
              <p className="text-[10px] font-bold text-ink-900">Priya Nair</p>
              <p className="text-[9px] text-ink-400">Senior Frontend Engineer</p>
            </div>
            <span className="ml-auto rounded-full bg-emerald-50 px-1.5 py-0.5 text-[8px] font-bold text-emerald-700">
              92% match
            </span>
          </div>
          <div className="mt-2 rounded-lg border border-ink-100 p-2">
            <p className="flex items-center gap-1 text-[9px] font-semibold text-ink-700">
              <Mail className="h-2.5 w-2.5" /> Outreach message
            </p>
            <p className="mt-1 line-clamp-3 text-[9px] leading-snug text-ink-500">
              Hi Priya, I came across your profile and was impressed by your work on scalable UI systems...
            </p>
            <div className="mt-1.5 flex items-center justify-end gap-1 text-brand-600">
              <Send className="h-3 w-3" />
            </div>
          </div>
          <div className="mt-2 rounded-lg border border-ink-100 p-2 text-[9px] text-ink-500">
            <p className="flex items-center gap-1 font-semibold text-ink-700">
              <MessageSquare className="h-2.5 w-2.5" /> Stage
            </p>
            <p className="mt-1 rounded-md bg-ink-50 px-1.5 py-1 text-center font-semibold text-ink-700">Applied</p>
          </div>
        </div>
      </div>

      {/* Hiring funnel */}
      <div className="border-t border-ink-100 px-4 py-3">
        <p className="mb-2 text-[10px] font-semibold text-ink-700">Hiring funnel</p>
        <div className="flex items-end gap-3">
          {funnel.map((f) => (
            <div key={f.stage} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-brand-600 to-brand-400"
                style={{ height: `${Math.max((f.value / max) * 48, 6)}px` }}
              />
              <p className="text-[9px] font-bold text-ink-900">{f.value.toLocaleString()}</p>
              <p className="text-[8px] text-ink-400">{f.stage}</p>
            </div>
          ))}
        </div>
      </div>

      <p aria-hidden className="px-4 pb-3 text-[9px] text-ink-300">
        Illustrative product preview
      </p>
    </div>
  );
}
