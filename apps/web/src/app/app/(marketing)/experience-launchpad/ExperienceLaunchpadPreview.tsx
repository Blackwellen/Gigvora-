// Illustrative Experience Launchpad preview — profile completeness, experience
// milestones, top skills, endorsements, experience timeline, portfolio
// highlights, growth insights, career roadmap, personal brand score (CSS
// conic-gradient ring), and a weekly goal card. Built from real Tailwind/div
// markup, not a screenshot.
export function ExperienceLaunchpadPreview() {
  const milestones = [{ label: 'Level 6 — Senior Professional', sub: '2,480 XP to Level 7' }];

  const skills = [
    { label: 'Product Strategy', value: 92 },
    { label: 'Roadmapping', value: 89 },
    { label: 'Analytics', value: 86 },
    { label: 'Leadership', value: 84 },
    { label: 'Communication', value: 82 },
  ];

  const endorsements = ['OB', 'ML', 'PN', 'JC', 'SP'];

  const timeline = [
    { role: 'Senior Product Manager', company: 'Acme Corporation · Full-time', date: 'Mar 2023 — Present · 2 yrs 2 mo', current: true },
    { role: 'Product Manager', company: 'Nebula Labs · Full-time', date: 'Jun 2021 — Mar 2023 · 1 yr 9 mo' },
    { role: 'Associate Product Manager', company: 'Brightside · Full-time', date: 'Jan 2019 — May 2021 · 2 yrs 5 mo' },
  ];

  const portfolio = [
    { title: 'Analytics Dashboard Redesign', tag: 'Case study · 2024' },
    { title: 'Q2 Roadmap Strategy', tag: 'Presentation · 2024' },
  ];

  const growth = [
    { label: 'Profile views', value: '1,248', delta: '+18%' },
    { label: 'Connections', value: '96', delta: '+8%' },
    { label: 'Search appearances', value: '342', delta: '+24%' },
    { label: 'Opportunity views', value: '28', delta: '+33%' },
  ];

  const brandScore = 82;

  return (
    <div className="w-full max-w-[780px] overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-floating">
      <div className="flex items-center gap-3 border-b border-ink-100 px-4 py-2.5">
        <span className="text-sm font-extrabold text-ink-900">Gigvora</span>
        <span className="rounded-md bg-ink-50 px-2 py-1 text-[11px] font-semibold text-ink-600">Acme Workspace ▾</span>
        <div className="ml-2 hidden flex-1 items-center gap-4 text-[11px] font-semibold text-ink-400 sm:flex">
          <span>Live Feed</span>
          <span>Network</span>
          <span className="text-brand-600">Experience</span>
          <span>Pages</span>
        </div>
        <span className="ml-auto h-5 w-5 rounded-full bg-ink-200" />
      </div>

      <div className="grid grid-cols-4 gap-2.5 p-3">
        {/* Profile card */}
        <div className="col-span-1 rounded-lg border border-ink-100 p-2.5">
          <div className="flex items-center gap-2">
            <span className="h-7 w-7 shrink-0 rounded-full bg-brand-100" />
            <div className="min-w-0">
              <p className="truncate text-[9px] font-bold text-ink-900">Olivia Bennett</p>
              <p className="truncate text-[7px] text-ink-400">Product Strategist &amp; Manager</p>
            </div>
          </div>
          <p className="mt-2 text-[8px] font-semibold text-ink-700">Profile completeness</p>
          <p className="text-[13px] font-extrabold text-brand-600">82%</p>
          <div className="mt-1 h-1.5 w-full rounded-full bg-ink-50">
            <div className="h-1.5 rounded-full bg-brand-500" style={{ width: '82%' }} />
          </div>
          <p className="mt-2 text-[7px] text-ink-400">Almost there! Complete 3 more steps.</p>
        </div>

        {/* Experience milestone */}
        <div className="col-span-1 rounded-lg border border-ink-100 p-2.5">
          <p className="text-[9px] font-semibold text-ink-700">Experience milestone</p>
          {milestones.map((m) => (
            <div key={m.label} className="mt-2">
              <p className="text-[8px] font-bold text-ink-900">{m.label}</p>
              <p className="mt-1 h-1.5 w-full rounded-full bg-ink-50">
                <span className="block h-1.5 w-4/5 rounded-full bg-gradient-to-r from-brand-500 to-brand-600" />
              </p>
              <p className="mt-1 text-[7px] text-ink-400">{m.sub}</p>
            </div>
          ))}
        </div>

        {/* Top skills */}
        <div className="col-span-1 rounded-lg border border-ink-100 p-2.5">
          <p className="text-[9px] font-semibold text-ink-700">Top skills</p>
          <div className="mt-2 space-y-1">
            {skills.slice(0, 4).map((s) => (
              <div key={s.label} className="flex items-center justify-between text-[7px] text-ink-500">
                <span className="truncate">{s.label}</span>
                <span className="font-semibold text-ink-700">{s.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Endorsements */}
        <div className="col-span-1 rounded-lg border border-ink-100 p-2.5">
          <p className="text-[9px] font-semibold text-ink-700">Endorsements</p>
          <p className="text-[7px] text-ink-400">126 received</p>
          <div className="mt-2 flex -space-x-1.5">
            {endorsements.map((e) => (
              <span
                key={e}
                className="flex h-5 w-5 items-center justify-center rounded-full border border-white bg-ink-100 text-[7px] font-bold text-ink-600"
              >
                {e}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1.2fr_1fr] gap-2.5 px-3 pb-3">
        {/* Experience timeline */}
        <div className="rounded-lg border border-ink-100 p-2.5">
          <p className="text-[9px] font-semibold text-ink-700">Experience timeline</p>
          <div className="mt-2 space-y-2 border-l border-ink-100 pl-2.5">
            {timeline.map((t) => (
              <div key={t.role} className="relative">
                <span
                  className={`absolute -left-[13px] top-0.5 h-1.5 w-1.5 rounded-full ${t.current ? 'bg-brand-600' : 'bg-ink-300'}`}
                />
                <p className="text-[8px] font-bold text-ink-900">{t.role}</p>
                <p className="text-[7px] text-ink-500">{t.company}</p>
                <p className="text-[7px] text-ink-400">{t.date}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Portfolio highlights */}
        <div className="rounded-lg border border-ink-100 p-2.5">
          <p className="text-[9px] font-semibold text-ink-700">Portfolio highlights</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {portfolio.map((p) => (
              <div key={p.title} className="rounded-md bg-gradient-to-br from-brand-50 to-ink-50 p-1.5">
                <div className="h-7 rounded bg-white/60" />
                <p className="mt-1 truncate text-[7px] font-semibold text-ink-800">{p.title}</p>
                <p className="text-[6px] text-ink-400">{p.tag}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_0.7fr_0.7fr] gap-2.5 px-3 pb-3">
        {/* Growth insights */}
        <div className="rounded-lg border border-ink-100 p-2.5">
          <p className="text-[9px] font-semibold text-ink-700">Growth insights — this month</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {growth.map((g) => (
              <div key={g.label}>
                <p className="text-[10px] font-extrabold text-ink-900">{g.value}</p>
                <p className="truncate text-[7px] text-ink-400">{g.label}</p>
                <p className="text-[7px] font-semibold text-emerald-600">{g.delta}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Personal brand score */}
        <div className="flex flex-col items-center justify-center rounded-lg border border-ink-100 p-2.5 text-center">
          <p className="text-[9px] font-semibold text-ink-700">Personal brand score</p>
          <div
            className="relative mt-1.5 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: `conic-gradient(#4f46e5 ${brandScore * 3.6}deg, #eef2f7 0deg)` }}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[9px] font-extrabold text-ink-900">
              {brandScore}
            </div>
          </div>
          <p className="mt-1 text-[7px] font-semibold text-emerald-600">+6 this month</p>
        </div>

        {/* Weekly goal */}
        <div className="rounded-lg border border-ink-100 p-2.5">
          <p className="text-[9px] font-semibold text-ink-700">Weekly goal</p>
          <p className="mt-1.5 text-[8px] text-ink-600">Add 1 portfolio piece</p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-ink-50">
            <div className="h-1.5 w-0 rounded-full bg-brand-500" />
          </div>
          <p className="mt-1 text-[7px] text-ink-400">0/1 completed</p>
        </div>
      </div>

      <p aria-hidden className="px-4 pb-3 text-[9px] text-ink-300">
        Illustrative product preview
      </p>
    </div>
  );
}
