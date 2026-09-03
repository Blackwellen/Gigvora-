'use client';

import Link from 'next/link';
import {
  Bell,
  Mail,
  Smartphone,
  Volume2,
  Circle,
  Eye,
  MessageSquare,
  Inbox,
  Ban,
  Archive,
  Paperclip,
  Video,
  Sparkles,
  FileText,
  PenLine,
  ShieldAlert,
  FlagTriangleRight,
  Lock,
  Building2,
  Settings2,
  RotateCcw,
  ExternalLink,
  HelpCircle,
  ArrowLeft,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/cn';
import { useEntitlements, useHasFeature } from '@/hooks/useEntitlements';
import {
  useMessagingSettings,
  useUpdateMessagingSettings,
  DEFAULT_MESSAGING_SETTINGS,
  type MessagingSettings,
} from '@/hooks/useMessagingSettings';

// Same plan-key -> label map UserMenu.tsx uses for the account-menu plan
// badge; kept as a small local copy here since that map isn't exported.
const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  professional: 'Professional',
  business: 'Business',
  recruiter: 'Recruiter',
  recruiter_pro: 'Recruiter Pro',
  sales_navigator: 'Sales Navigator',
  enterprise: 'Enterprise',
  unlimited: 'Unlimited',
};

// Publicly-sold top tier is 'enterprise' ('unlimited' is the internal/founder
// plan and never shown an upgrade pitch). The Pro promo card only renders
// below this set.
const TOP_TIER_PLANS = new Set(['enterprise', 'unlimited']);

type Option<T extends string> = { value: T; label: string };

function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-40',
        checked ? 'bg-brand-600' : 'bg-ink-200 dark:bg-ink-700'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-[18px]' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}

function Select<T extends string>({
  value,
  onChange,
  options,
  disabled,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<Option<T>>;
  disabled?: boolean;
  label: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as T)}
      className="h-7 max-w-[140px] rounded-lg border border-ink-200 bg-white px-2 text-xs font-medium text-ink-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-xs text-ink-600 dark:text-ink-300">{label}</span>
      {children}
    </div>
  );
}

function Caption({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 border-t border-ink-100 pt-2 text-[11px] leading-snug text-ink-400 dark:border-ink-800 dark:text-ink-500">{children}</p>;
}

function DisabledLinkRow({ label, reason }: { label: string; reason: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1 opacity-50" title={reason}>
      <span className="text-xs text-ink-600 dark:text-ink-300">{label}</span>
      <span className="text-[11px] font-medium text-ink-400">{reason}</span>
    </div>
  );
}

function RealLinkRow({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 py-1 text-xs text-ink-600 hover:text-brand-600 dark:text-ink-300 dark:hover:text-brand-400"
    >
      <span>{label}</span>
      <ExternalLink className="h-3.5 w-3.5" />
    </Link>
  );
}

function SettingsCard({
  icon: Icon,
  title,
  description,
  badge,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
          <div>
            <h3 className="text-sm font-bold text-ink-900 dark:text-white">{title}</h3>
            <p className="text-[11px] text-ink-400 dark:text-ink-500">{description}</p>
          </div>
        </div>
        {badge}
      </div>
      <div className="space-y-0.5">{children}</div>
    </Card>
  );
}

const NOTIFY_FOR_OPTIONS: Array<Option<MessagingSettings['notifications']['notifyFor']>> = [
  { value: 'all_messages', label: 'All messages' },
  { value: 'mentions_dms', label: 'Mentions & DMs' },
  { value: 'mentions_only', label: 'Mentions only' },
  { value: 'nothing', label: 'Nothing' },
];

const QUIET_HOURS_OPTIONS: Array<Option<string>> = [
  { value: 'off', label: 'Off' },
  { value: '22:00-07:00', label: '10:00 PM – 7:00 AM' },
  { value: '23:00-06:00', label: '11:00 PM – 6:00 AM' },
  { value: '00:00-08:00', label: '12:00 AM – 8:00 AM' },
];

const DIGEST_OPTIONS: Array<Option<MessagingSettings['emailAlerts']['digestFrequency']>> = [
  { value: 'realtime', label: 'Real-time' },
  { value: 'daily', label: 'Daily digest' },
  { value: 'weekly', label: 'Weekly digest' },
  { value: 'off', label: 'Off' },
];

const NEW_MESSAGE_EMAIL_OPTIONS: Array<Option<MessagingSettings['emailAlerts']['newMessageEmails']>> = [
  { value: 'all_conversations', label: 'All conversations' },
  { value: 'unread_only', label: 'Unread only' },
  { value: 'off', label: 'Off' },
];

const PUSH_FOR_OPTIONS: Array<Option<MessagingSettings['push']['notifyFor']>> = [
  { value: 'all_messages', label: 'All messages' },
  { value: 'direct_messages', label: 'Direct messages' },
  { value: 'mentions_only', label: 'Mentions only' },
  { value: 'nothing', label: 'Nothing' },
];

const CRITICAL_ALERTS_OPTIONS: Array<Option<MessagingSettings['push']['criticalAlerts']>> = [
  { value: 'always', label: 'Always' },
  { value: 'when_dnd_off', label: 'When DND is off' },
  { value: 'never', label: 'Never' },
];

const SOUND_OPTIONS: Array<Option<MessagingSettings['desktopSounds']['sound']>> = [
  { value: 'chime', label: 'Chime' },
  { value: 'ping', label: 'Ping' },
  { value: 'pop', label: 'Pop' },
  { value: 'none', label: 'None' },
];

const VOLUME_OPTIONS: Array<Option<MessagingSettings['desktopSounds']['volume']>> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const STATUS_DISPLAY_OPTIONS: Array<Option<MessagingSettings['availability']['statusDisplay']>> = [
  { value: 'to_all_contacts', label: 'To all contacts' },
  { value: 'connections_only', label: 'Connections only' },
  { value: 'hidden', label: 'Hidden' },
];

const READ_RECEIPT_VISIBILITY_OPTIONS: Array<Option<MessagingSettings['readReceipts']['visibility']>> = [
  { value: 'everyone', label: 'To everyone' },
  { value: 'connections_only', label: 'Connections only' },
  { value: 'nobody', label: 'Nobody' },
];

const MOVE_TO_OPTIONS: Array<Option<MessagingSettings['messageRequests']['moveTo']>> = [
  { value: 'requests', label: 'Non-contacts' },
  { value: 'inbox', label: 'Inbox' },
  { value: 'archive', label: 'Archive' },
];

const THRESHOLD_OPTIONS: Array<Option<'low' | 'medium' | 'high'>> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const RETENTION_PERIOD_OPTIONS: Array<Option<MessagingSettings['retention']['period']>> = [
  { value: '30_days', label: '30 days' },
  { value: '90_days', label: '90 days' },
  { value: '1_year', label: '1 year' },
  { value: '2_years', label: '2 years' },
  { value: 'forever', label: 'Forever' },
];

const RETENTION_APPLY_TO_OPTIONS: Array<Option<MessagingSettings['retention']['applyTo']>> = [
  { value: 'all_conversations', label: 'All conversations' },
  { value: 'direct_messages_only', label: 'Direct messages only' },
  { value: 'group_chats_only', label: 'Group chats only' },
];

const WHO_CAN_SEND_OPTIONS: Array<Option<MessagingSettings['fileSharing']['whoCanSend']>> = [
  { value: 'all_users', label: 'All users' },
  { value: 'connections_only', label: 'Connections only' },
  { value: 'nobody', label: 'Nobody' },
];

const SIZE_LIMIT_OPTIONS: Array<Option<MessagingSettings['fileSharing']['sizeLimit']>> = [
  { value: '10mb', label: '10 MB' },
  { value: '25mb', label: '25 MB' },
  { value: '100mb', label: '100 MB' },
  { value: '500mb', label: '500 MB' },
];

const FILE_TYPES_OPTIONS: Array<Option<MessagingSettings['fileSharing']['fileTypes']>> = [
  { value: 'all_types', label: 'All types' },
  { value: 'documents_images', label: 'Documents & images' },
  { value: 'images_only', label: 'Images only' },
];

const MIC_OPTIONS: Array<Option<MessagingSettings['callDefaults']['defaultMicrophone']>> = [
  { value: 'system_default', label: 'System default' },
  { value: 'muted', label: 'Muted' },
];

const QUALITY_OPTIONS: Array<Option<MessagingSettings['callDefaults']['defaultQuality']>> = [
  { value: 'auto_hd', label: 'Auto (HD)' },
  { value: 'standard', label: 'Standard' },
  { value: 'data_saver', label: 'Data saver' },
];

const TONE_OPTIONS: Array<Option<MessagingSettings['smartReplies']['tone']>> = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'friendly', label: 'Friendly' },
];

const LENGTH_OPTIONS: Array<Option<MessagingSettings['smartReplies']['suggestionLength']>> = [
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'long', label: 'Long' },
];

const MIN_MESSAGES_OPTIONS: Array<Option<MessagingSettings['conversationSummaries']['minMessages']>> = [
  { value: '8', label: '8+ messages' },
  { value: '15', label: '15+ messages' },
  { value: '25', label: '25+ messages' },
  { value: '50', label: '50+ messages' },
];

const SUMMARY_LENGTH_OPTIONS: Array<Option<MessagingSettings['conversationSummaries']['summaryLength']>> = [
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'detailed', label: 'Detailed' },
];

const DRAFT_TONE_OPTIONS: Array<Option<MessagingSettings['aiDrafting']['defaultTone']>> = [
  { value: 'friendly', label: 'Friendly' },
  { value: 'professional', label: 'Professional' },
  { value: 'concise', label: 'Concise' },
];

const ENCRYPT_OPTIONS: Array<Option<MessagingSettings['privacyControls']['encryptMessages']>> = [
  { value: 'end_to_end', label: 'End-to-end' },
  { value: 'standard', label: 'Standard' },
  { value: 'off', label: 'Off' },
];

const HIDE_ONLINE_OPTIONS: Array<Option<'on' | 'off'>> = [
  { value: 'off', label: 'Off' },
  { value: 'on', label: 'On' },
];

const RETENTION_YEARS_OPTIONS: Array<Option<MessagingSettings['enterpriseCompliance']['retentionPolicyYears']>> = [
  { value: '1', label: '1 year' },
  { value: '3', label: '3 years' },
  { value: '7', label: '7 years' },
  { value: 'indefinite', label: 'Indefinite' },
];

export default function MessagingSettingsPage() {
  const { data: settings } = useMessagingSettings();
  const update = useUpdateMessagingSettings();
  const { data: entitlements } = useEntitlements();
  const hasEnterpriseConnect = useHasFeature('enterprise_connect');

  const s = settings ?? DEFAULT_MESSAGING_SETTINGS;

  function patch<K extends keyof MessagingSettings>(section: K, fields: Partial<MessagingSettings[K]>) {
    update.mutate({ [section]: fields } as Partial<MessagingSettings>);
  }

  function resetDefaults() {
    update.mutate(DEFAULT_MESSAGING_SETTINGS);
  }

  const planKey = entitlements?.planKey;
  const planLabel = planKey ? PLAN_LABELS[planKey] || planKey : 'Free';
  const showUpgradePromo = !planKey || !TOP_TIER_PLANS.has(planKey);
  const enterpriseGateKnown = hasEnterpriseConnect !== undefined;
  const enterpriseAllowed = hasEnterpriseConnect === true;
  const enterpriseControlsDisabled = enterpriseGateKnown && !enterpriseAllowed;

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 lg:px-6">
      <Link
        href="/app/inbox"
        className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-brand-600 dark:text-ink-400 dark:hover:text-brand-400"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to messaging
      </Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-[-0.01em] text-ink-900 dark:text-white">Messaging Settings</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Customize how you send, receive, and manage messages across Gigvora.</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button variant="outline" size="sm" onClick={resetDefaults} disabled={update.isPending}>
            <RotateCcw className="h-3.5 w-3.5" />
            Reset defaults
          </Button>
          <span className="text-[11px] text-ink-400 dark:text-ink-500">{update.isPending ? 'Saving…' : 'All changes are autosaved'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-400 dark:text-ink-500">General preferences</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SettingsCard icon={Bell} title="Notifications" description="Control in-app and browser notifications.">
                <Row label="In-app notifications">
                  <Switch label="In-app notifications" checked={s.notifications.inApp} onChange={(v) => patch('notifications', { inApp: v })} />
                </Row>
                <Row label="Browser notifications">
                  <Switch label="Browser notifications" checked={s.notifications.browser} onChange={(v) => patch('notifications', { browser: v })} />
                </Row>
                <Row label="Quiet hours">
                  <Select label="Quiet hours" value={s.notifications.quietHours} onChange={(v) => patch('notifications', { quietHours: v })} options={QUIET_HOURS_OPTIONS} />
                </Row>
                <Row label="Notify for">
                  <Select label="Notify for" value={s.notifications.notifyFor} onChange={(v) => patch('notifications', { notifyFor: v })} options={NOTIFY_FOR_OPTIONS} />
                </Row>
              </SettingsCard>

              <SettingsCard icon={Mail} title="Email alerts" description="Manage email notifications.">
                <Row label="Email notifications">
                  <Switch label="Email notifications" checked={s.emailAlerts.enabled} onChange={(v) => patch('emailAlerts', { enabled: v })} />
                </Row>
                <Row label="Digest frequency">
                  <Select label="Digest frequency" value={s.emailAlerts.digestFrequency} onChange={(v) => patch('emailAlerts', { digestFrequency: v })} options={DIGEST_OPTIONS} />
                </Row>
                <Row label="Include message previews">
                  <Switch label="Include message previews" checked={s.emailAlerts.includePreviews} onChange={(v) => patch('emailAlerts', { includePreviews: v })} />
                </Row>
                <Row label="New message emails">
                  <Select label="New message emails" value={s.emailAlerts.newMessageEmails} onChange={(v) => patch('emailAlerts', { newMessageEmails: v })} options={NEW_MESSAGE_EMAIL_OPTIONS} />
                </Row>
              </SettingsCard>

              <SettingsCard icon={Smartphone} title="Push settings" description="Manage mobile push notifications.">
                <Row label="Mobile push notifications">
                  <Switch label="Mobile push notifications" checked={s.push.mobileEnabled} onChange={(v) => patch('push', { mobileEnabled: v })} />
                </Row>
                <Row label="Push for">
                  <Select label="Push for" value={s.push.notifyFor} onChange={(v) => patch('push', { notifyFor: v })} options={PUSH_FOR_OPTIONS} />
                </Row>
                <Row label="Vibrate">
                  <Switch label="Vibrate" checked={s.push.vibrate} onChange={(v) => patch('push', { vibrate: v })} />
                </Row>
                <Row label="Critical alerts">
                  <Select label="Critical alerts" value={s.push.criticalAlerts} onChange={(v) => patch('push', { criticalAlerts: v })} options={CRITICAL_ALERTS_OPTIONS} />
                </Row>
              </SettingsCard>

              <SettingsCard icon={Volume2} title="Desktop sounds" description="Play sounds for new messages.">
                <Row label="Enable sounds">
                  <Switch label="Enable sounds" checked={s.desktopSounds.enabled} onChange={(v) => patch('desktopSounds', { enabled: v })} />
                </Row>
                <Row label="Sound">
                  <Select label="Sound" value={s.desktopSounds.sound} onChange={(v) => patch('desktopSounds', { sound: v })} options={SOUND_OPTIONS} />
                </Row>
                <Row label="Volume">
                  <Select label="Volume" value={s.desktopSounds.volume} onChange={(v) => patch('desktopSounds', { volume: v })} options={VOLUME_OPTIONS} />
                </Row>
                <Row label="Play for mentions">
                  <Switch label="Play for mentions" checked={s.desktopSounds.playForMentions} onChange={(v) => patch('desktopSounds', { playForMentions: v })} />
                </Row>
              </SettingsCard>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-400 dark:text-ink-500">Communication & experience</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SettingsCard icon={Circle} title="Availability status" description="Show when you're available.">
                <Row label="Show my status">
                  <Switch label="Show my status" checked={s.availability.showStatus} onChange={(v) => patch('availability', { showStatus: v })} />
                </Row>
                <Row label="Status display">
                  <Select label="Status display" value={s.availability.statusDisplay} onChange={(v) => patch('availability', { statusDisplay: v })} options={STATUS_DISPLAY_OPTIONS} />
                </Row>
                <div className="pt-1">
                  <Input
                    aria-label="Custom status"
                    placeholder="Custom status"
                    value={s.availability.customStatus}
                    onChange={(e) => patch('availability', { customStatus: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </SettingsCard>

              <SettingsCard icon={Eye} title="Read receipts" description="Let others know when you've read.">
                <Row label="Send read receipts">
                  <Switch label="Send read receipts" checked={s.readReceipts.send} onChange={(v) => patch('readReceipts', { send: v })} />
                </Row>
                <Row label="Read receipt visibility">
                  <Select label="Read receipt visibility" value={s.readReceipts.visibility} onChange={(v) => patch('readReceipts', { visibility: v })} options={READ_RECEIPT_VISIBILITY_OPTIONS} />
                </Row>
                <Caption>End-to-end encrypted conversations always hide read receipts.</Caption>
              </SettingsCard>

              <SettingsCard icon={MessageSquare} title="Typing indicators" description="Show when you're typing.">
                <Row label="Show typing indicators">
                  <Switch label="Show typing indicators" checked={s.typingIndicators.show} onChange={(v) => patch('typingIndicators', { show: v })} />
                </Row>
                <Row label="Show for group chats">
                  <Switch label="Show for group chats" checked={s.typingIndicators.showForGroupChats} onChange={(v) => patch('typingIndicators', { showForGroupChats: v })} />
                </Row>
                <Caption>Typing indicators are disabled in end-to-end encrypted chats.</Caption>
              </SettingsCard>

              <SettingsCard icon={Inbox} title="Message requests filtering" description="Control who can message you.">
                <Row label="Filter unknown senders">
                  <Switch label="Filter unknown senders" checked={s.messageRequests.filterUnknown} onChange={(v) => patch('messageRequests', { filterUnknown: v })} />
                </Row>
                <Row label="Move to">
                  <Select label="Move to" value={s.messageRequests.moveTo} onChange={(v) => patch('messageRequests', { moveTo: v })} options={MOVE_TO_OPTIONS} />
                </Row>
                <Row label="Spam confidence threshold">
                  <Select label="Spam confidence threshold" value={s.messageRequests.spamThreshold} onChange={(v) => patch('messageRequests', { spamThreshold: v })} options={THRESHOLD_OPTIONS} />
                </Row>
              </SettingsCard>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SettingsCard icon={Ban} title="Blocked senders" description="Manage blocked users and domains.">
                <DisabledLinkRow label="Blocked users" reason="Coming soon" />
                <DisabledLinkRow label="Blocked domains" reason="Coming soon" />
                <DisabledLinkRow label="Blocked phone numbers" reason="Coming soon" />
              </SettingsCard>

              <SettingsCard icon={Archive} title="Retention" description="Auto-delete messages after a period.">
                <Row label="Retention period">
                  <Select label="Retention period" value={s.retention.period} onChange={(v) => patch('retention', { period: v })} options={RETENTION_PERIOD_OPTIONS} />
                </Row>
                <Row label="Apply to">
                  <Select label="Apply to" value={s.retention.applyTo} onChange={(v) => patch('retention', { applyTo: v })} options={RETENTION_APPLY_TO_OPTIONS} />
                </Row>
                <Caption>Enterprise retention policies may override your selection.</Caption>
              </SettingsCard>

              <SettingsCard icon={Paperclip} title="File-sharing permissions" description="Control file sharing in conversations.">
                <Row label="Who can send files">
                  <Select label="Who can send files" value={s.fileSharing.whoCanSend} onChange={(v) => patch('fileSharing', { whoCanSend: v })} options={WHO_CAN_SEND_OPTIONS} />
                </Row>
                <Row label="File size limit">
                  <Select label="File size limit" value={s.fileSharing.sizeLimit} onChange={(v) => patch('fileSharing', { sizeLimit: v })} options={SIZE_LIMIT_OPTIONS} />
                </Row>
                <Row label="File types">
                  <Select label="File types" value={s.fileSharing.fileTypes} onChange={(v) => patch('fileSharing', { fileTypes: v })} options={FILE_TYPES_OPTIONS} />
                </Row>
              </SettingsCard>

              <SettingsCard icon={Video} title="Video & call defaults" description="Set defaults for calls and meetings.">
                <Row label="Default video">
                  <Switch label="Default video" checked={s.callDefaults.defaultVideoOn} onChange={(v) => patch('callDefaults', { defaultVideoOn: v })} />
                </Row>
                <Row label="Default microphone">
                  <Select label="Default microphone" value={s.callDefaults.defaultMicrophone} onChange={(v) => patch('callDefaults', { defaultMicrophone: v })} options={MIC_OPTIONS} />
                </Row>
                <Row label="Default call quality">
                  <Select label="Default call quality" value={s.callDefaults.defaultQuality} onChange={(v) => patch('callDefaults', { defaultQuality: v })} options={QUALITY_OPTIONS} />
                </Row>
              </SettingsCard>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {/* Smart replies / Conversation summaries / AI drafting carry a
                  "Pro" badge as a visual signal only: there is no dedicated
                  AI-messaging feature key in apps/api/src/modules/billing/entitlements.js's
                  PLAN_FEATURES yet, so these stay fully enabled/functional for
                  every plan rather than fabricating a gate the backend doesn't
                  enforce. Swap in a real useHasFeature() check here once such
                  a key exists. */}
              <SettingsCard
                icon={Sparkles}
                title="Smart replies (LLM)"
                description="Suggest replies using AI."
                badge={<Badge tone="brand"><Sparkles className="mr-0.5 inline h-3 w-3" />Pro</Badge>}
              >
                <Row label="Enable smart replies">
                  <Switch label="Enable smart replies" checked={s.smartReplies.enabled} onChange={(v) => patch('smartReplies', { enabled: v })} />
                </Row>
                <Row label="Tone">
                  <Select label="Tone" value={s.smartReplies.tone} onChange={(v) => patch('smartReplies', { tone: v })} options={TONE_OPTIONS} />
                </Row>
                <Row label="Suggestion length">
                  <Select label="Suggestion length" value={s.smartReplies.suggestionLength} onChange={(v) => patch('smartReplies', { suggestionLength: v })} options={LENGTH_OPTIONS} />
                </Row>
                <Caption>Uses secure LLMs. No training on your data.</Caption>
              </SettingsCard>

              <SettingsCard
                icon={FileText}
                title="Conversation summaries"
                description="Summarize long conversations."
                badge={<Badge tone="brand"><Sparkles className="mr-0.5 inline h-3 w-3" />Pro</Badge>}
              >
                <Row label="Enable summaries">
                  <Switch label="Enable summaries" checked={s.conversationSummaries.enabled} onChange={(v) => patch('conversationSummaries', { enabled: v })} />
                </Row>
                <Row label="Auto-summarize long threads">
                  <Switch
                    label="Auto-summarize long threads"
                    checked={s.conversationSummaries.autoSummarizeLongThreads}
                    onChange={(v) => patch('conversationSummaries', { autoSummarizeLongThreads: v })}
                  />
                </Row>
                <Row label="Minimum messages">
                  <Select label="Minimum messages" value={s.conversationSummaries.minMessages} onChange={(v) => patch('conversationSummaries', { minMessages: v })} options={MIN_MESSAGES_OPTIONS} />
                </Row>
                <Row label="Summary length">
                  <Select label="Summary length" value={s.conversationSummaries.summaryLength} onChange={(v) => patch('conversationSummaries', { summaryLength: v })} options={SUMMARY_LENGTH_OPTIONS} />
                </Row>
              </SettingsCard>

              <SettingsCard
                icon={PenLine}
                title="AI drafting preferences"
                description="Draft messages with AI."
                badge={<Badge tone="brand"><Sparkles className="mr-0.5 inline h-3 w-3" />Pro</Badge>}
              >
                <Row label="Enable AI drafting">
                  <Switch label="Enable AI drafting" checked={s.aiDrafting.enabled} onChange={(v) => patch('aiDrafting', { enabled: v })} />
                </Row>
                <Row label="Default tone">
                  <Select label="Default tone" value={s.aiDrafting.defaultTone} onChange={(v) => patch('aiDrafting', { defaultTone: v })} options={DRAFT_TONE_OPTIONS} />
                </Row>
                <Row label="Include context from thread">
                  <Switch label="Include context from thread" checked={s.aiDrafting.includeContextFromThread} onChange={(v) => patch('aiDrafting', { includeContextFromThread: v })} />
                </Row>
                <Row label="Confirm before sending">
                  <Switch label="Confirm before sending" checked={s.aiDrafting.confirmBeforeSending} onChange={(v) => patch('aiDrafting', { confirmBeforeSending: v })} />
                </Row>
              </SettingsCard>

              <SettingsCard icon={ShieldAlert} title="Abuse detection sensitivity" description="Detect and flag abusive content.">
                <Row label="Sensitivity level">
                  <Select label="Sensitivity level" value={s.abuseDetection.sensitivity} onChange={(v) => patch('abuseDetection', { sensitivity: v })} options={THRESHOLD_OPTIONS} />
                </Row>
                <Row label="Detect spam">
                  <Switch label="Detect spam" checked={s.abuseDetection.detectSpam} onChange={(v) => patch('abuseDetection', { detectSpam: v })} />
                </Row>
                <Row label="Detect threats">
                  <Switch label="Detect threats" checked={s.abuseDetection.detectThreats} onChange={(v) => patch('abuseDetection', { detectThreats: v })} />
                </Row>
                <Row label="Detect harassment">
                  <Switch label="Detect harassment" checked={s.abuseDetection.detectHarassment} onChange={(v) => patch('abuseDetection', { detectHarassment: v })} />
                </Row>
              </SettingsCard>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SettingsCard icon={FlagTriangleRight} title="Moderation review" description="Review flagged content.">
                <Row label="Auto-flag messages">
                  <Switch label="Auto-flag messages" checked={s.moderationReview.autoFlagMessages} onChange={(v) => patch('moderationReview', { autoFlagMessages: v })} />
                </Row>
                <Row label="Require manual review">
                  <Switch label="Require manual review" checked={s.moderationReview.requireManualReview} onChange={(v) => patch('moderationReview', { requireManualReview: v })} />
                </Row>
                <DisabledLinkRow label="Review queue" reason="Coming soon" />
              </SettingsCard>

              <SettingsCard icon={Lock} title="Privacy controls" description="Manage message privacy.">
                <Row label="Encrypt messages">
                  <Select label="Encrypt messages" value={s.privacyControls.encryptMessages} onChange={(v) => patch('privacyControls', { encryptMessages: v })} options={ENCRYPT_OPTIONS} />
                </Row>
                <Row label="Hide online status">
                  <Select
                    label="Hide online status"
                    value={s.privacyControls.hideOnlineStatus ? 'on' : 'off'}
                    onChange={(v) => patch('privacyControls', { hideOnlineStatus: v === 'on' })}
                    options={HIDE_ONLINE_OPTIONS}
                  />
                </Row>
                <Row label="Allow link previews">
                  <Switch label="Allow link previews" checked={s.privacyControls.allowLinkPreviews} onChange={(v) => patch('privacyControls', { allowLinkPreviews: v })} />
                </Row>
              </SettingsCard>

              <SettingsCard
                icon={Building2}
                title="Enterprise compliance"
                description="Meet enterprise policies."
                badge={<Badge tone="warning">Enterprise</Badge>}
              >
                {enterpriseControlsDisabled && (
                  <p className="mb-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">Requires the Enterprise plan.</p>
                )}
                <Row label="Data loss prevention (DLP)">
                  <Switch
                    label="Data loss prevention"
                    checked={s.enterpriseCompliance.dlpEnabled}
                    disabled={enterpriseControlsDisabled}
                    onChange={(v) => patch('enterpriseCompliance', { dlpEnabled: v })}
                  />
                </Row>
                <Row label="eDiscovery hold">
                  <Switch
                    label="eDiscovery hold"
                    checked={s.enterpriseCompliance.ediscoveryHold}
                    disabled={enterpriseControlsDisabled}
                    onChange={(v) => patch('enterpriseCompliance', { ediscoveryHold: v })}
                  />
                </Row>
                <Row label="Audit logging">
                  <Switch
                    label="Audit logging"
                    checked={s.enterpriseCompliance.auditLogging}
                    disabled={enterpriseControlsDisabled}
                    onChange={(v) => patch('enterpriseCompliance', { auditLogging: v })}
                  />
                </Row>
                <Row label="Retention policy">
                  <Select
                    label="Retention policy"
                    value={s.enterpriseCompliance.retentionPolicyYears}
                    disabled={enterpriseControlsDisabled}
                    onChange={(v) => patch('enterpriseCompliance', { retentionPolicyYears: v })}
                    options={RETENTION_YEARS_OPTIONS}
                  />
                </Row>
              </SettingsCard>

              <SettingsCard icon={Settings2} title="Advanced" description="Developer and power user options.">
                <DisabledLinkRow label="Message shortcuts" reason="Coming soon" />
                <DisabledLinkRow label="Keyboard shortcuts" reason="Coming soon" />
                <DisabledLinkRow label="Export message history" reason="Coming soon" />
              </SettingsCard>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink-900 dark:text-white">Plan & usage</h3>
              <Badge tone={TOP_TIER_PLANS.has(planKey ?? '') ? 'success' : 'brand'}>{planLabel} Plan</Badge>
            </div>
            <p className="text-[11px] text-ink-400 dark:text-ink-500">
              Smart replies, conversation summaries, and AI drafting are available on every plan today. Usage metering for these
              features isn&apos;t wired up yet, so no specific numbers are shown here.
            </p>
            <Link href="/pricing" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-400">
              Manage plan
              <ExternalLink className="h-3 w-3" />
            </Link>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-bold text-ink-900 dark:text-white">Change history</h3>
            <p className="mt-2 text-[11px] text-ink-400 dark:text-ink-500">
              Change history isn&apos;t available yet — this settings surface doesn&apos;t have an audit log endpoint.
            </p>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-bold text-ink-900 dark:text-white">Need help?</h3>
            <Link
              href="/help-centre"
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-400"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              Visit Help Center
            </Link>
          </Card>

          {showUpgradePromo && (
            <Card className="border-brand-200 bg-brand-50/60 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-brand-700 dark:text-brand-300">
                <Sparkles className="h-4 w-4" />
                Unlock more with Gigvora Pro
              </h3>
              <p className="mt-1.5 text-[11px] text-brand-700/80 dark:text-brand-300/80">
                Advanced AI writing, summaries, and smarter conversations.
              </p>
              <Link href="/pricing" className="mt-3 inline-block">
                <Button size="sm">Upgrade now</Button>
              </Link>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
