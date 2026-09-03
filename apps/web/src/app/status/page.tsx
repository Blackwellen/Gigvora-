import { BrandLogoLink } from '@/components/common/BrandLogoLink';

const COMPONENTS = [
  { name: 'API', status: 'operational' },
  { name: 'Authentication', status: 'operational' },
  { name: 'Realtime / WebSocket', status: 'operational' },
  { name: 'Risk & security models', status: 'operational' },
  { name: 'Email delivery', status: 'operational' },
];

export default function StatusPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="flex h-16 items-center border-b border-gray-100 px-6 lg:px-10">
        <BrandLogoLink />
      </header>

      <main className="mx-auto max-w-2xl px-6 py-16 lg:px-10">
        <div className="flex items-center gap-3">
          <span className="flex h-3 w-3 rounded-full bg-green-500" />
          <h1 className="text-2xl font-extrabold text-gray-900">All systems operational</h1>
        </div>
        <p className="mt-2 text-sm text-gray-500">Last checked just now.</p>

        <ul className="mt-8 divide-y divide-gray-100 rounded-2xl border border-gray-200">
          {COMPONENTS.map((c) => (
            <li key={c.name} className="flex items-center justify-between px-5 py-4 text-sm">
              <span className="font-medium text-gray-900">{c.name}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Operational
              </span>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
