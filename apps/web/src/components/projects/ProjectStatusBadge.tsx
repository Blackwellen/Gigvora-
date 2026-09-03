import { Badge } from '@/components/ui/Badge';
import type { PmProjectStatus, PmTaskStatus, PmMilestoneStatus, PmDeliverableStatus } from '@/hooks/projects/types';

const PROJECT_STATUS_TONE: Record<PmProjectStatus, { tone: 'brand' | 'neutral' | 'success' | 'warning' | 'danger'; label: string; dot: string }> = {
  draft: { tone: 'neutral', label: 'Draft', dot: 'bg-ink-400' },
  active: { tone: 'success', label: 'Active', dot: 'bg-emerald-500' },
  on_hold: { tone: 'warning', label: 'On hold', dot: 'bg-amber-500' },
  completed: { tone: 'brand', label: 'Completed', dot: 'bg-brand-500' },
  archived: { tone: 'neutral', label: 'Archived', dot: 'bg-ink-400' },
};

export function ProjectStatusBadge({ status }: { status: PmProjectStatus }) {
  const cfg = PROJECT_STATUS_TONE[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-600 dark:text-ink-300">
      <span className={`h-2 w-2 rounded-full ${cfg.dot}`} aria-hidden />
      {cfg.label}
    </span>
  );
}

const TASK_STATUS_TONE: Record<PmTaskStatus, { tone: 'brand' | 'neutral' | 'success' | 'warning' | 'danger'; label: string }> = {
  todo: { tone: 'neutral', label: 'To do' },
  in_progress: { tone: 'brand', label: 'In progress' },
  in_review: { tone: 'warning', label: 'In review' },
  blocked: { tone: 'danger', label: 'Blocked' },
  done: { tone: 'success', label: 'Done' },
};

export function TaskStatusBadge({ status }: { status: PmTaskStatus }) {
  const cfg = TASK_STATUS_TONE[status];
  return <Badge tone={cfg.tone}>{cfg.label}</Badge>;
}

const PRIORITY_TONE: Record<string, 'neutral' | 'brand' | 'warning' | 'danger'> = {
  low: 'neutral',
  medium: 'brand',
  high: 'warning',
  urgent: 'danger',
};

export function TaskPriorityBadge({ priority }: { priority: string }) {
  return (
    <Badge tone={PRIORITY_TONE[priority] || 'neutral'} className="capitalize">
      {priority}
    </Badge>
  );
}

const MILESTONE_STATUS_TONE: Record<PmMilestoneStatus, { tone: 'brand' | 'neutral' | 'success' | 'warning' | 'danger'; label: string }> = {
  draft: { tone: 'neutral', label: 'Draft' },
  planned: { tone: 'neutral', label: 'Planned' },
  active: { tone: 'brand', label: 'Active' },
  submitted: { tone: 'warning', label: 'Submitted' },
  in_review: { tone: 'warning', label: 'In review' },
  approved: { tone: 'success', label: 'Approved' },
  rejected: { tone: 'danger', label: 'Rejected' },
  completed: { tone: 'success', label: 'Completed' },
  cancelled: { tone: 'neutral', label: 'Cancelled' },
};

export function MilestoneStatusBadge({ status }: { status: PmMilestoneStatus }) {
  const cfg = MILESTONE_STATUS_TONE[status];
  return <Badge tone={cfg.tone}>{cfg.label}</Badge>;
}

const DELIVERABLE_STATUS_TONE: Record<PmDeliverableStatus, { tone: 'brand' | 'neutral' | 'success' | 'warning' | 'danger'; label: string }> = {
  pending: { tone: 'neutral', label: 'Pending' },
  submitted: { tone: 'warning', label: 'Submitted' },
  in_review: { tone: 'warning', label: 'In review' },
  accepted: { tone: 'success', label: 'Accepted' },
  rejected: { tone: 'danger', label: 'Rejected' },
};

export function DeliverableStatusBadge({ status }: { status: PmDeliverableStatus }) {
  const cfg = DELIVERABLE_STATUS_TONE[status];
  return <Badge tone={cfg.tone}>{cfg.label}</Badge>;
}
