export const ACCOUNT_TYPES = ['individual', 'recruiter', 'company'];
export const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract', 'internship', 'temporary'];
export const WORK_MODES = ['onsite', 'remote', 'hybrid'];
export const APPLICATION_STATUSES = [
  'submitted',
  'reviewing',
  'shortlisted',
  'interviewing',
  'offered',
  'rejected',
  'withdrawn',
];

// Domain 18 — Projects, Workspaces, Tasks & Delivery
export const PM_PROJECT_STATUSES = ['draft', 'active', 'on_hold', 'completed', 'archived'];
export const PM_PROJECT_TYPES = ['internal', 'client', 'marketplace', 'freelance'];
export const PM_PROJECT_MEMBER_ROLES = ['owner', 'manager', 'client', 'professional', 'reviewer', 'finance', 'guest', 'custom'];
export const PM_TASK_STATUSES = ['todo', 'in_progress', 'in_review', 'blocked', 'done'];
export const PM_TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
export const PM_MILESTONE_STATUSES = [
  'draft',
  'planned',
  'active',
  'submitted',
  'in_review',
  'approved',
  'rejected',
  'completed',
  'cancelled',
];
export const PM_DELIVERABLE_STATUSES = ['pending', 'submitted', 'in_review', 'accepted', 'rejected'];
export const PM_TASK_DEPENDENCY_TYPES = ['finish_to_start', 'start_to_start', 'finish_to_finish'];
export const PM_BOARD_COLUMNS = ['backlog', 'todo', 'in_progress', 'in_review', 'done'];
