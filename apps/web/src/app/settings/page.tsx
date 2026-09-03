import { DomainPendingNotice } from '@/components/shell/DomainPendingNotice';

export default function SettingsPage() {
  return (
    <DomainPendingNotice
      title="Account Settings"
      description="Full account settings (profile, billing, integrations) ship as their own domain. This is a real, authenticated route — not a dead link — waiting on that build."
    />
  );
}
