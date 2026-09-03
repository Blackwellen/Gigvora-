'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

export function HelpSearchBar({ initialQuery = '' }: { initialQuery?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    router.push(trimmed ? `/help-centre?q=${encodeURIComponent(trimmed)}` : '/help-centre');
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-ink-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search for articles, topics, or keywords..."
        className="w-full rounded-xl border border-transparent bg-white py-3.5 pl-11 pr-4 text-sm text-ink-900 shadow-lg outline-none placeholder:text-ink-400 focus:ring-2 focus:ring-brand-500/40"
      />
    </form>
  );
}
