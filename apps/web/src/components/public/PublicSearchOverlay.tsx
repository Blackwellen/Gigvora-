'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Briefcase, Sparkles, Users, Building2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

const QUICK_DESTINATIONS = [
  { label: 'Gigs', href: '/gigs-marketplace', icon: Sparkles },
  { label: 'Jobs', href: '/jobs-marketplace', icon: Briefcase },
  { label: 'Talent', href: '/talent-directory', icon: Users },
  { label: 'Companies', href: '/company-directory', icon: Building2 },
];

export function PublicSearchOverlay({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (query: string) => void;
}) {
  const [value, setValue] = useState('');

  return (
    <Modal open={open} onClose={onClose} className="max-w-xl" labelledBy="public-search-title">
      <form
        className="p-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) onSubmit(value.trim());
        }}
      >
        <h2 id="public-search-title" className="sr-only">
          Search Gigvora
        </h2>
        <div className="flex items-center gap-3 border-b border-ink-100 px-4 py-3">
          <Search className="h-5 w-5 text-ink-400" />
          <input
            data-autofocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Search gigs, jobs, companies, talent..."
            className="w-full border-0 bg-transparent text-base text-ink-900 outline-none placeholder:text-ink-400"
          />
        </div>
        <div className="flex flex-wrap gap-2 p-4">
          {QUICK_DESTINATIONS.map((dest) => (
            <Link
              key={dest.href}
              href={dest.href}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
            >
              <dest.icon className="h-3.5 w-3.5" />
              Browse {dest.label}
            </Link>
          ))}
        </div>
      </form>
    </Modal>
  );
}
