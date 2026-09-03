import { DomainPendingNotice } from '@/components/shell/DomainPendingNotice';

export default function NetworkPage() {
  return (
    <DomainPendingNotice
      title="Network"
      description="Connections, followers and people-you-may-know already have real API support (connections, follows). The full Network page UI is a separate domain build — this route is wired and real, just not yet fleshed out."
    />
  );
}
