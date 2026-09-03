import type { ReactNode } from 'react';
import { BrandLogoLink } from '@/components/common/BrandLogoLink';

export function AuthShell({
  children,
  headerRight,
}: {
  children: ReactNode;
  headerRight?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <header className="flex h-16 items-center justify-between border-b border-gray-200 px-6">
        <BrandLogoLink width={140} height={47} className="h-8 w-auto" />
        <div className="flex items-center gap-4 text-sm text-gray-500">{headerRight}</div>
      </header>
      <main className="relative overflow-hidden">
        <DecorativeRing />
        {children}
      </main>
      <footer className="border-t border-gray-100 px-6 py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Gigvora, Inc. All rights reserved.
      </footer>
    </div>
  );
}

export function DecorativeRing({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute right-[-10%] top-10 h-[420px] w-[420px] rounded-full border-[56px] border-brand-50 ${className}`}
    />
  );
}
