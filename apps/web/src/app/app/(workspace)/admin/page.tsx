import { DomainPendingNotice } from '@/components/shell/DomainPendingNotice';

export default function WorkspaceAdminPage() {
  return <DomainPendingNotice title="Workspace Admin" description="Workspace-wide administration (roles, billing, policies) is a separate domain build, not part of this Platform Shell pass." />;
}
