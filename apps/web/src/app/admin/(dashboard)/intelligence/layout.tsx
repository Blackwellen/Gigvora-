'use client';

import { useState } from 'react';
import { BrainCircuit } from 'lucide-react';
import { IntelligenceTabs } from '@/components/admin/IntelligenceTabs';
import { IntelligenceEnvironmentContext, type Environment } from '@/lib/admin/intelligenceEnvironment';

/**
 * Shell for Domain 26 (Machine Learning, Matching, Ranking & Intelligence) — nested inside the
 * platform-admin dashboard layout (`/admin/(dashboard)/layout.tsx`), which already provides the
 * AdminTopBar, AdminSidebar (gated to roles whose ROLE_SECTIONS includes 'intelligence') and the
 * auth/role check. This adds only the section header + local sub-nav + a shared
 * development/staging/production environment selector (spec §85) that every page below reads.
 */
export default function IntelligenceLayout({ children }: { children: React.ReactNode }) {
  const [environment, setEnvironment] = useState<Environment>('production');

  return (
    <IntelligenceEnvironmentContext.Provider value={{ environment, setEnvironment }}>
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink-900">
              <BrainCircuit className="h-6 w-6 text-purple-600" />
              Machine Learning &amp; Intelligence
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-ink-500">
              Monitor Gigvora&apos;s matching, ranking, recommendations, parsing, scoring and model health from one shared
              intelligence layer.
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-control border border-ink-100 bg-white p-1 shadow-surface">
            {(['development', 'staging', 'production'] as Environment[]).map((env) => (
              <button
                key={env}
                type="button"
                onClick={() => setEnvironment(env)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                  environment === env ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-ink-50'
                }`}
              >
                {env}
              </button>
            ))}
          </div>
        </div>

        <IntelligenceTabs />

        <div className="py-5">{children}</div>
      </div>
    </IntelligenceEnvironmentContext.Provider>
  );
}
