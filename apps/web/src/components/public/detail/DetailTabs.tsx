'use client';

import { useState, type ReactNode } from 'react';
import { Tabs } from '@/components/ui/Tabs';

export type DetailTabDef = { key: string; label: string; content: ReactNode };

/**
 * Client-side tab switcher for detail pages. Content for every tab is
 * rendered server-side (real fetched data / honest empty states) and handed
 * in as ReactNode — this component only owns which panel is visible.
 */
export function DetailTabs({ tabs, defaultKey }: { tabs: DetailTabDef[]; defaultKey?: string }) {
  const [active, setActive] = useState(defaultKey ?? tabs[0]?.key ?? '');
  const activeTab = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div>
      <Tabs tabs={tabs.map((t) => ({ key: t.key, label: t.label }))} value={active} onChange={setActive} />
      <div
        role="tabpanel"
        id={activeTab ? `tabpanel-${activeTab.key}` : undefined}
        aria-labelledby={activeTab ? `tab-${activeTab.key}` : undefined}
        tabIndex={0}
        className="pt-5 focus-visible:outline-none"
      >
        {activeTab?.content}
      </div>
    </div>
  );
}
