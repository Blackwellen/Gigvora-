import { Edit3, Folder, CheckSquare, MessageSquare, Upload, FileText, Briefcase, Users2, Calendar } from 'lucide-react';

export type QuickCreateAction = {
  key: string;
  label: string;
  description: string;
  icon: typeof Edit3;
  route?: string; // present = real, wired action
};

/**
 * Single source of truth for "what can I create" entry points, shared by the
 * QuickCreate modal (overlays/QuickCreate.tsx) and the Creation Studio top-bar
 * widget (shell/widgets/CreationStudioWidget.tsx) so the two surfaces never
 * drift out of sync.
 */
export const QUICK_CREATE_ACTIONS: QuickCreateAction[] = [
  { key: 'post', label: 'Post', description: 'Share updates, ideas, or announcements', icon: Edit3, route: '/app/live-feed?compose=1' },
  { key: 'message', label: 'Message', description: 'Send a direct message', icon: MessageSquare, route: '/app/chat-bubble?new=1' },
  { key: 'project', label: 'Project', description: 'Plan, track, and deliver projects', icon: Folder },
  { key: 'gig', label: 'Gig', description: 'Post or browse gig opportunities', icon: Briefcase },
  { key: 'page', label: 'Page', description: 'Create a new content page', icon: FileText },
  { key: 'group', label: 'Group', description: 'Build and engage your community', icon: Users2 },
  { key: 'event', label: 'Event', description: 'Organize and invite to events', icon: Calendar },
  { key: 'task', label: 'Task', description: 'Create and assign a task', icon: CheckSquare },
  { key: 'file', label: 'File Upload', description: 'Upload and share files', icon: Upload },
];
