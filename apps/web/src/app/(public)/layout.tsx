import { AppProviders } from '@/components/shell/AppProviders';
import { PublicHeader } from '@/components/public/PublicHeader';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
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
    </AppProviders>
  );
}
