// Backed by /api/v1/disputes — apps/api/src/modules/disputes. Generic,
// cross-domain dispute engine (currently wired to Domain 18 payment
// milestones; the object_type/object_id shape is designed to be reusable
// for a future gig-payment domain without changing this contract).
export type DisputeStage = 'opened' | 'evidence_submitted' | 'under_review' | 'resolved_client' | 'resolved_professional' | 'resolved_split' | 'closed';

export type Dispute = {
  id: string;
  objectType: string;
  objectId: string;
  raisedBy: string;
  againstUserId: string;
  reason: string;
  stage: DisputeStage;
  resolvedSplitPct: number | null;
  resolutionNote: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  canResolve?: boolean;
};

export type DisputeEvidence = { id: string; submittedBy: string; description: string; filename: string | null; createdAt: string };
export type DisputeMessage = { id: string; authorId: string; body: string; createdAt: string };
