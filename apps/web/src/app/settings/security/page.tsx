import { DomainPendingNotice } from '@/components/shell/DomainPendingNotice';

export default function SecuritySettingsPage() {
  return (
    <DomainPendingNotice
      title="Security"
      description="Session, device, MFA and passkey management already exist in the API (see apps/api/src/modules/security, mfa, passkeys) — this settings UI surface is a separate domain not yet wired to a page."
    />
  );
}
