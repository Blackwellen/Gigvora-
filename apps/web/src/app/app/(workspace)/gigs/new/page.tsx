import { DomainPendingNotice } from '@/components/shell/DomainPendingNotice';

export default function PostGigPage() {
  return (
    <DomainPendingNotice
      title="Post a Gig"
      description="Gig posting/authoring UI is a separate domain build. The underlying jobs table and API already exist (apps/api/src/modules/jobs) — this is the creation form waiting on that build."
    />
  );
}
