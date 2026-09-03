// Illustrative Sales Navigator preview — AI lead prioritisation, pipeline
// funnel, lead discovery table, relationship insights, activity feed.
export function SalesNavigatorPreview() {
  const leads = [
    { name: 'Ethan Brooks', role: 'VP of Engineering, Brightside', score: 92, tag: 'High' },
    { name: 'Priya Nair', role: 'Head of Design, Layered', score: 88, tag: 'High' },
    { name: 'James Carter', role: 'Engineering Manager, Vertex', score: 82, tag: 'High' },
    { name: 'Sophia Patel', role: 'Product Lead, Nebula Labs', score: 78, tag: 'Good fit' },
  ];

  const funnel = [
    { stage: 'New', value: 1248 },
    { stage: 'Qualified', value: 312 },
    { stage: 'Proposal', value: 142 },
    { stage: 'Negotiation', value: 86 },
    { stage: 'Closed Won', value: 46 },
  ];
  const max = funnel[0].value;

  const activity = [
    { name: 'Priya Nair', text: 'Opened your email', time: '2m ago' },
    { name: 'Ethan Brooks', text: 'Viewed pricing page', time: '15m ago' },
    { name: 'James Carter', text: 'Replied to your message', time: '45m ago' },
  ];

  return (
    <div className="w-full max-w-[780px] overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-floating">
      <div className="flex items-center gap-3 border-b border-ink-100 px-4 py-2.5">
        <span className="text-sm font-extrabold text-ink-900">Gigvora</span>
        <span className="rounded-md bg-ink-50 px-2 py-1 text-[11px] font-semibold text-ink-600">Acme Workspace ▾</span>
        <div className="ml-2 hidden flex-1 items-center gap-4 text-[11px] font-semibold text-ink-400 sm:flex">
          <span className="text-brand-600">Overview</span>
          <span>Lead Search</span>
          <span>Accounts</span>
          <span>Outreach</span>
        </div>
        <span className="ml-auto h-5 w-5 rounded-full bg-ink-200" />
      </div>

      <div className="grid grid-cols-[1.1fr_1fr_0.9fr] gap-2.5 p-3">
        <div className="rounded-lg border border-ink-100 p-2.5">
          <p className="text-[9px] font-semibold text-ink-700">AI Lead Prioritisation</p>
          <div className="mt-2 space-y-1.5">
            {leads.map((l) => (
              <div key={l.name} className="flex items-center gap-1.5">
                <span className="h-5 w-5 rounded-full bg-ink-100" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[8px] font-bold text-ink-900">{l.name}</p>
                  <p className="truncate text-[7px] text-ink-400">{l.role}</p>
                </div>
                <span className="shrink-0 text-[8px] font-bold text-brand-600">{l.score}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-ink-100 p-2.5">
          <p className="text-[9px] font-semibold text-ink-700">Pipeline Overview</p>
          <div className="mt-2 flex items-end justify-between gap-1">
            {funnel.map((f) => (
              <div key={f.stage} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-gradient-to-t from-brand-600 to-brand-400"
                  style={{ height: `${Math.max((f.value / max) * 40, 5)}px` }}
                />
                <p className="text-[7px] font-bold text-ink-900">{f.value}</p>
              </div>
            ))}
          </div>
          <p className="mt-1 text-center text-[7px] text-ink-400">New → Qualified → Proposal → Negotiation → Closed</p>
        </div>

        <div className="rounded-lg border border-ink-100 p-2.5">
          <p className="text-[9px] font-semibold text-ink-700">Activity Stream</p>
          <div className="mt-2 space-y-1.5">
            {activity.map((a) => (
              <div key={a.name} className="flex items-start gap-1.5">
                <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-ink-100" />
                <p className="text-[7px] text-ink-500">
                  <span className="font-semibold text-ink-800">{a.name}</span> {a.text} · {a.time}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-ink-100 p-3">
        <p className="mb-1.5 text-[9px] font-semibold text-ink-700">Lead Discovery</p>
        <div className="overflow-hidden rounded-lg border border-ink-100">
          <table className="w-full text-[8px]">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50/60 text-left text-ink-400">
                <th className="px-2 py-1">Lead</th>
                <th className="px-2 py-1">Company</th>
                <th className="px-2 py-1">Score</th>
                <th className="px-2 py-1">Intent</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.name} className="border-b border-ink-50 last:border-0">
                  <td className="px-2 py-1 font-semibold text-ink-800">{l.name}</td>
                  <td className="px-2 py-1 text-ink-500">{l.role.split(', ')[1]}</td>
                  <td className="px-2 py-1 text-ink-700">{l.score}</td>
                  <td className="px-2 py-1 text-brand-600">{l.tag}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p aria-hidden className="px-4 pb-3 text-[9px] text-ink-300">
        Illustrative product preview
      </p>
    </div>
  );
}
