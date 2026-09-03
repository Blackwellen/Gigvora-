import { AppProviders } from '@/components/shell/AppProviders';

// Shared providers only. Authenticated workspace routes live under the
// (workspace) route group (own layout adds AuthGate + GlobalTopBar).
// Public marketing routes under /app/* (recruiter, recruiter-pro,
// sales-navigator, enterprise-connect, experience-launchpad,
// blog--resources) live under the (marketing) route group and use the
// canonical PublicHeader/PublicFooter instead.
export default function AppSegmentLayout({ children }: { children: React.ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}
