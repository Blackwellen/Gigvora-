import { PublicHeader } from '@/components/public/PublicHeader';

// Public product-marketing pages that happen to live under the /app/*
// prefix (Recruiter, Recruiter Pro, Sales Navigator, Enterprise Connect,
// Experience Launchpad, Blog/Resources). AppProviders already comes from
// the parent app/app/layout.tsx; this group intentionally does NOT apply
// AuthGate — these are public pages, not the authenticated workspace.
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-floating focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
      >
        Skip to main content
      </a>
      <PublicHeader />
      {children}
    </div>
  );
}
