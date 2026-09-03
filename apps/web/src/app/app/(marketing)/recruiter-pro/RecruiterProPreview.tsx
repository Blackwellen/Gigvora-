// Illustrative Recruiter Pro dashboard mock — real Tailwind/div markup, not a
// screenshot, matching the reference design's stat tiles, funnel, AI
// shortlist, hiring velocity sparkline, and team activity feed.
export function RecruiterProPreview() {
  const stats = [
    { label: 'Total Candidates', value: '128,540', delta: '+18.1%' },
    { label: 'Contacted', value: '45,281', delta: '+21.3%' },
    { label: 'Response Rate', value: '34.6%', delta: '+5.4pp' },
    { label: 'Shortlisted', value: '8,320', delta: '+16.2%' },
    { label: 'Hires', value: '312', delta: '+12.8%' },
  ];

  const funnel = [
    { stage: 'Sourced', value: 128540 },
    { stage: 'Contacted', value: 45281 },
    { stage: 'Replied', value: 15668 },
    { stage: 'Screened', value: 9245 },
    { stage: 'Shortlisted', value: 8320 },
    { stage: 'Hired', value: 312 },
  ];
  const max = funnel[0].value;

  const shortlist = [
    { name: 'Aarav Patel', role: 'Senior Frontend Engineer', score: '96%' },
    { name: 'Sophia Kim', role: 'Product Designer', score: '93%' },
    { name: 'Marcus Lee', role: 'Backend Engineer', score: '91%' },
  ];

  const velocity = [180, 210, 205, 260, 280, 312];

  const activity = ['Olivia Bennett', 'Marcus Lee', 'Priya Nair', 'James Carter'];

  return (
    <div className="w-full max-w-[780px] overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-floating">
      <div className="flex items-center gap-3 border-b border-ink-100 px-4 py-2.5">
        <span className="text-sm font-extrabold text-ink-900">Gigvora</span>
        <span className="rounded-md bg-ink-50 px-2 py-1 text-[11px] font-semibold text-ink-600">Acme Workspace ▾</span>
        <div className="ml-2 hidden flex-1 items-center gap-4 text-[11px] font-semibold text-ink-400 sm:flex">
          <span>Candidates</span>
          <span>Pipeline</span>
          <span className="text-brand-600">Sequences</span>
          <span>Analytics</span>
        </div>
        <span className="ml-auto h-5 w-5 rounded-full bg-ink-200" />
      </div>

      <div className="p-3">
        <p className="mb-2 text-[11px] font-bold text-ink-900">Recruiter Pro Dashboard</p>
        <div className="grid grid-cols-5 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border border-ink-100 p-2">
              <p className="truncate text-[8px] text-ink-400">{s.label}</p>
              <p className="text-[11px] font-extrabold text-ink-900">{s.value}</p>
              <p className="text-[8px] font-semibold text-emerald-600">{s.delta}</p>
            </div>
          ))}
        </div>

        <div className="mt-2.5 grid grid-cols-[1.1fr_1fr_1fr] gap-2.5">
          <div className="rounded-lg border border-ink-100 p-2.5">
            <p className="text-[9px] font-semibold text-ink-700">Pipeline Overview</p>
            <div className="mt-2 space-y-1">
              {funnel.map((f) => (
                <div key={f.stage} className="flex items-center gap-1.5">
                  <span className="w-14 shrink-0 text-[8px] text-ink-400">{f.stage}</span>
                  <div className="h-2 flex-1 rounded-full bg-ink-50">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-brand-600"
                      style={{ width: `${Math.max((f.value / max) * 100, 4)}%` }}
                    />
                  </div>
                  <span className="w-9 shrink-0 text-right text-[8px] font-semibold text-ink-700">
                    {f.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-ink-100 p-2.5">
            <p className="text-[9px] font-semibold text-ink-700">AI Shortlist (Top Matches)</p>
            <div className="mt-2 space-y-1.5">
              {shortlist.map((s) => (
                <div key={s.name} className="flex items-center gap-1.5">
                  <span className="h-5 w-5 rounded-full bg-ink-100" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[8px] font-bold text-ink-900">{s.name}</p>
                    <p className="truncate text-[7px] text-ink-400">{s.role}</p>
                  </div>
                  <span className="shrink-0 text-[8px] font-bold text-emerald-600">{s.score}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-ink-100 p-2.5">
            <p className="text-[9px] font-semibold text-ink-700">Team Activity</p>
            <div className="mt-2 space-y-1.5">
              {activity.map((a) => (
                <div key={a} className="flex items-center gap-1.5">
                  <span className="h-5 w-5 rounded-full bg-ink-100" />
                  <p className="flex-1 truncate text-[8px] font-semibold text-ink-800">{a}</p>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-2.5 rounded-lg border border-ink-100 p-2.5">
          <p className="text-[9px] font-semibold text-ink-700">Hiring Velocity — this quarter</p>
          <svg viewBox="0 0 240 48" className="mt-2 h-12 w-full">
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-brand-500"
              points={velocity.map((v, i) => `${(i / (velocity.length - 1)) * 240},${48 - (v / 320) * 44}`).join(' ')}
            />
          </svg>
        </div>
      </div>

      <p aria-hidden className="px-4 pb-3 text-[9px] text-ink-300">
        Illustrative product preview
      </p>
    </div>
  );
}
