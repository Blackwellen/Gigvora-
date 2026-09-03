'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { FaqItem } from '@/lib/publicContent';

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  if (items.length === 0) return null;

  return (
    <div className="divide-y divide-ink-100 rounded-2xl border border-ink-100">
      {items.map((item, i) => {
        const open = openIndex === i;
        const buttonId = `faq-question-${i}`;
        const panelId = `faq-panel-${i}`;
        return (
          <div key={item.q}>
            <h3 className="m-0">
              <button
                type="button"
                id={buttonId}
                onClick={() => setOpenIndex(open ? null : i)}
                aria-expanded={open}
                aria-controls={panelId}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
              >
                {item.q}
                <ChevronDown className={cn('h-4 w-4 shrink-0 text-ink-400 transition-transform', open && 'rotate-180')} />
              </button>
            </h3>
            {open && (
              <p id={panelId} role="region" aria-labelledby={buttonId} className="px-5 pb-4 text-sm text-ink-600">
                {item.a}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
