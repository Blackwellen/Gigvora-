// Backed by /api/v1/pm-projects — apps/api/src/modules/pm-projects.
// Domain 18 (Projects, Workspaces, Tasks & Delivery) — Phase A core types.

export type PmProjectStatus = 'draft' | 'active' | 'on_hold' | 'completed' | 'archived';
export type PmProjectType = 'internal' | 'client' | 'marketplace' | 'freelance';
export type PmMemberRole = 'owner' | 'manager' | 'client' | 'professional' | 'reviewer' | 'finance' | 'guest' | 'custom';
export type PmTaskStatus = 'todo' | 'in_progress' | 'in_review' | 'blocked' | 'done';
export type PmTaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type PmBoardColumn = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done';
export type PmMilestoneStatus = 'draft' | 'planned' | 'active' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'completed' | 'cancelled';
export type PmDeliverableStatus = 'pending' | 'submitted' | 'in_review' | 'accepted' | 'rejected';

export type PmProject = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: PmProjectStatus;
  projectType: PmProjectType;
  category: string | null;
  countryCode: string | null;
  workspaceType: 'personal' | 'organization';
  companyId: string | null;
  ownerId: string;
  clientName: string | null;
  sourceMarketplaceProjectId: string | null;
  startDate: string | null;
  targetEndDate: string | null;
  actualEndDate: string | null;
  progressPct: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  openToBids: boolean;
  myRole?: PmMemberRole;
  taskCount?: number;
  taskDoneCount?: number;
  taskOverdueCount?: number;
  memberCount?: number;
  milestoneCount?: number;
};

// Public-safe project shape — GET /pm-projects/marketplace and the
// non-member branch of GET /pm-projects/:id/brief. Deliberately narrower
// than PmProject: no budget/status/member/version fields, since these are
// visible to people who are not (yet) project members.
export type PmPublicProject = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  countryCode: string | null;
  clientName: string | null;
  targetEndDate: string | null;
  createdAt: string;
  isMember?: false;
};

// GET /pm-projects/:id/brief returns either the public shape above (when
// the viewer isn't a member) or the full PmProject (when they are) — this
// union lets the brief page branch on `isMember` to decide whether to show
// the apply form or a link into the full project workspace.
export type PmProjectBrief = PmPublicProject | (PmProject & { isMember: true });

export type PmMilestone = {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  status: PmMilestoneStatus;
  targetDate: string | null;
  amount: number | null;
  completionPct: number;
  createdAt: string;
  updatedAt: string;
  deliverableCount?: number;
  taskCount?: number;
  taskDoneCount?: number;
};

export type PmDeliverable = {
  id: string;
  projectId: string;
  milestoneId: string | null;
  title: string;
  description: string | null;
  status: PmDeliverableStatus;
  ownerId: string | null;
  dueDate: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PmProjectMember = {
  id: string;
  projectId: string;
  userId: string;
  role: PmMemberRole;
  customRoleLabel: string | null;
  invitationStatus: 'pending' | 'accepted' | 'declined';
  invitedBy: string | null;
  joinedAt: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
};

export type PmTask = {
  id: string;
  projectId: string;
  parentTaskId: string | null;
  milestoneId: string | null;
  deliverableId: string | null;
  title: string;
  description: string | null;
  status: PmTaskStatus;
  priority: PmTaskPriority;
  assigneeId: string | null;
  reporterId: string;
  dueDate: string | null;
  startDate: string | null;
  estimateHours: number | null;
  boardColumn: PmBoardColumn;
  boardOrder: number;
  labels: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
};

// --- Phase B ---------------------------------------------------------------

export type PmProjectFile = {
  id: string;
  projectId: string;
  taskId: string | null;
  deliverableId: string | null;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  version: number;
  replacesFileId: string | null;
  uploadedBy: string;
  createdAt: string;
};

export type PmDiscussion = {
  id: string;
  projectId: string;
  authorId: string;
  title: string;
  body: string;
  linkedTaskId: string | null;
  linkedMilestoneId: string | null;
  pinned: boolean;
  resolved: boolean;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PmDiscussionReply = { id: string; discussionId: string; authorId: string; body: string; createdAt: string };

export type PmTimeEntry = {
  id: string;
  projectId: string;
  taskId: string | null;
  userId: string;
  occurredOn: string;
  minutes: number;
  notes: string | null;
  billable: boolean;
  source: 'manual' | 'timer';
  running: boolean;
  createdAt: string;
};

export type PmTimesheetStatus = 'open' | 'submitted' | 'approved' | 'rejected';
export type PmTimesheet = {
  id: string;
  projectId: string;
  userId: string;
  weekStart: string;
  status: PmTimesheetStatus;
  totalMinutes: number;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
};

export type PmBudgetLine = { id: string; category: string; kind: string; plannedAmount: number; milestoneId: string | null };
export type PmBudget = {
  projectId: string;
  totalBudget: number;
  currency: string;
  contingencyPct: number;
  plannedFromLines: number;
  committed: number;
  paid: number;
  remaining: number;
  variancePct: number;
  billableHours: number;
  lines: PmBudgetLine[];
};
export type PmExpenseStatus = 'pending' | 'approved' | 'paid' | 'rejected';
export type PmExpense = { id: string; description: string; amount: number; status: PmExpenseStatus; incurredOn: string; budgetLineId?: string | null; submittedBy?: string };

export type PmApprovalMode = 'single' | 'sequential' | 'parallel' | 'quorum';
export type PmApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type PmApprovalStep = { id: string; approverId: string; stepOrder: number; decision: 'pending' | 'approved' | 'rejected'; comment: string | null; decidedAt: string | null };
export type PmApproval = {
  id: string;
  projectId: string;
  objectType: string;
  objectId: string;
  mode: PmApprovalMode;
  status: PmApprovalStatus;
  requestedBy: string;
  createdAt: string;
  steps: PmApprovalStep[];
};

export type PmChangeRequestStatus = 'draft' | 'submitted' | 'under_review' | 'needs_information' | 'approved' | 'rejected' | 'implemented' | 'cancelled';
export type PmChangeRequest = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  reason: string | null;
  scopeImpact: string | null;
  dateImpactDays: number | null;
  costImpact: number | null;
  status: PmChangeRequestStatus;
  requestedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type PmBidStatus = 'submitted' | 'shortlisted' | 'interviewing' | 'changes_requested' | 'accepted' | 'declined';
export type PmBid = {
  id: string;
  projectId: string;
  professionalId: string;
  coverLetter: string;
  rateType: 'fixed' | 'hourly';
  proposedAmount: number;
  estimatedDurationDays: number | null;
  availableFrom: string | null;
  status: PmBidStatus;
  createdAt: string;
  professional?: { firstName: string | null; lastName: string | null; headline: string | null };
};

export type PmPaySplit = {
  id: string;
  projectId: string;
  memberId: string;
  allocationType: 'percentage' | 'fixed' | 'milestone';
  percentage: number | null;
  fixedAmount: number | null;
  milestoneId: string | null;
  createdAt: string;
};

export type PmRiskKind = 'risk' | 'issue';
export type PmRiskSeverity = 'low' | 'medium' | 'high' | 'critical';
export type PmRiskStatus = 'open' | 'mitigating' | 'resolved' | 'accepted' | 'escalated';
export type PmRisk = {
  id: string;
  projectId: string;
  kind: PmRiskKind;
  title: string;
  description: string | null;
  category: string | null;
  probability: 'low' | 'medium' | 'high' | null;
  impact: 'low' | 'medium' | 'high' | null;
  severity: PmRiskSeverity;
  ownerId: string | null;
  mitigation: string | null;
  status: PmRiskStatus;
  dueDate: string | null;
  financialExposure: number | null;
  linkedTaskId: string | null;
  linkedMilestoneId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PmTaskDependency = { id: string; taskId: string; dependsOnTaskId: string; dependencyType: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' };

export type PmPaymentMilestoneStatus = 'draft' | 'funded' | 'in_progress' | 'submitted' | 'accepted' | 'release_pending' | 'released' | 'disputed' | 'refunded';
export type PmPaymentMilestone = {
  id: string;
  projectId: string;
  milestoneId: string;
  payeeUserId: string;
  amount: number;
  currency: string;
  status: PmPaymentMilestoneStatus;
  provider: string;
  providerTransferId: string | null;
  createdAt: string;
};

export type PmCompletionChecklist = {
  checks: {
    outstandingTasks: number;
    unresolvedIssues: number;
    overdueApprovals: number;
    unacceptedDeliverables: number;
    unapprovedMilestones: number;
    pendingTimesheets: number;
    pendingPaymentMilestones: number;
  };
  ready: boolean;
  blockingReasons: string[];
  status: 'in_progress' | 'completed';
  completedAt: string | null;
};

export type PmResourcePlanningRow = {
  memberId: string;
  userId: string;
  name: string;
  weeklyCapacityHours: number;
  trackedHoursLast7Days: number;
  openTaskCount: number;
  utilizationPct: number;
  status: 'overallocated' | 'underallocated' | 'balanced';
};

export type PmAnalyticsKpis = {
  taskCompletionPct: number;
  tasksOverdue: number;
  milestoneCompletionPct: number;
  budgetUsedPct: number;
  openRiskCount: number;
  changeRequestCount: number;
  totalTrackedHours: number;
};

export type PmDeliveryRisk =
  | { available: false }
  | {
      available: true;
      riskScore: number;
      riskBand: 'low' | 'medium' | 'high';
      scheduleRisk: string;
      budgetRisk: string;
      scopeRisk: string;
      reasonCodes: string[];
      modelName: string;
      modelVersion: string;
    };
