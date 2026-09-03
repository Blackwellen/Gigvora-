import { DomainPendingNotice } from '@/components/shell/DomainPendingNotice';

export default function GigsPage() {
  return (
    <DomainPendingNotice
      title="Gigs"
      description="The jobs/applications tables and API already exist (apps/api/src/modules/jobs, applications) — this discovery UI is a separate domain build, not part of the Platform Shell pass."
    />
  );
}
