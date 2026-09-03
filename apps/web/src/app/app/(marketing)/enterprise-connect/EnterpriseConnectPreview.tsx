// Illustrative Enterprise Connect preview — org stats, a simple nested-circle
// network graph (no chart library), cross-workspace collaboration,
// approvals, team directory, and admin analytics.
export function EnterpriseConnectPreview() {
  const stats = [
    { label: 'Active users', value: '18,320', delta: '+12.5%' },
    { label: 'Workspaces', value: '124', delta: '+8.2%' },
    { label: 'Active projects', value: '3,642', delta: '+15.7%' },
    { label: 'External partners', value: '2,418', delta: '+10.4%' },
  ];

  const collaboration = ['Product Launch · 24 members', 'Q2 Roadmap · 18 members', 'Client Onboarding · 12 members'];
  const approvals = [
    { label: 'Vendor Contract', tag: 'Pending' },
    { label: 'Security Review', tag: 'Pending' },
    { label: 'Budget Request', tag: 'Approved' },
  ];
  const team = ['Olivia Bennett', 'Marcus Lee', 'Priya Shah'];

  return (
    <div className="w-full max-w-[780px] overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-floating">
      <div className="flex items-center gap-3 border-b border-ink-100 px-4 py-2.5">
        <span className="text-sm font-extrabold text-ink-900">Gigvora</span>
        <span className="rounded-md bg-ink-50 px-2 py-1 text-[11px] font-semibold text-ink-600">Acme Global ▾</span>
        <div className="ml-2 hidden flex-1 items-center gap-4 text-[11px] font-semibold text-ink-400 sm:flex">
          <span>Live Feed</span>
          <span>Projects</span>
          <span className="text-brand-600">Approvals</span>
          <span>Admin</span>
        </div>
        <span className="ml-auto h-5 w-5 rounded-full bg-ink-200" />
      </div>

      <div className="p-3">
        <div className="grid grid-cols-4 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border border-ink-100 p-2">
              <p className="truncate text-[8px] text-ink-400">{s.label}</p>
              <p className="text-[11px] font-extrabold text-ink-900">{s.value}</p>
              <p className="text-[8px] font-semibold text-emerald-600">{s.delta}</p>
            </div>
          ))}
        </div>

        <div className="mt-2.5 grid grid-cols-[1fr_1fr_1fr] gap-2.5">
          {/* Network graph */}
          <div className="rounded-lg border border-ink-100 p-2.5">
            <p className="text-[9px] font-semibold text-ink-700">Network Graph</p>
            <svg viewBox="0 0 120 80" className="mt-2 h-16 w-full">
              <circle cx="60" cy="40" r="12" className="fill-brand-600" />
              {[
                [20, 15],
                [95, 18],
                [15, 62],
                [100, 60],
                [60, 10],
                [60, 72],
              ].map(([x, y], i) => (
                <g key={i}>
                  <line x1="60" y1="40" x2={x} y2={y} stroke="currentColor" strokeWidth="1" className="text-ink-200" />
                  <circle cx={x} cy={y} r="5" className={i % 2 === 0 ? 'fill-emerald-400' : 'fill-brand-300'} />
                </g>
              ))}
            </svg>
            <p className="mt-1 text-[7px] text-ink-400">Teams · Partners · Clients · Systems</p>
          </div>

          <div className="rounded-lg border border-ink-100 p-2.5">
            <p className="text-[9px] font-semibold text-ink-700">Cross-workspace Collaboration</p>
            <div className="mt-2 space-y-1.5 text-[8px] text-ink-600">
              {collaboration.map((c) => (
                <p key={c} className="truncate rounded-md bg-ink-50 px-1.5 py-1">
                  {c}
                </p>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-ink-100 p-2.5">
            <p className="text-[9px] font-semibold text-ink-700">Approvals</p>
            <div className="mt-2 space-y-1.5">
              {approvals.map((a) => (
                <div key={a.label} className="flex items-center justify-between text-[8px]">
                  <span className="truncate text-ink-700">{a.label}</span>
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 font-semibold ${
                      a.tag === 'Approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {a.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          <div className="rounded-lg border border-ink-100 p-2.5">
            <p className="text-[9px] font-semibold text-ink-700">Team Directory</p>
            <div className="mt-2 flex items-center gap-2">
              {team.map((t) => (
                <span key={t} className="flex h-6 w-6 items-center justify-center rounded-full bg-ink-100 text-[7px] font-bold text-ink-600">
                  {t.split(' ').map((n) => n[0]).join('')}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-ink-100 p-2.5">
            <p className="text-[9px] font-semibold text-ink-700">Admin Analytics</p>
            <div className="mt-2 flex items-center gap-4 text-[8px] text-ink-500">
              <span>
                <b className="block text-ink-900">56,142</b>User activity
              </span>
              <span>
                <b className="block text-ink-900">96</b>Security score
              </span>
            </div>
          </div>
        </div>
      </div>

      <p aria-hidden className="px-4 pb-3 text-[9px] text-ink-300">
        Illustrative product preview
      </p>
    </div>
  );
}
