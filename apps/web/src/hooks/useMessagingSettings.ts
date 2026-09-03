'use client';

// Backed by GET/PATCH /messaging-settings (apps/api/src/modules/copilot — Phase 2
// messaging platform). The endpoint stores a free-form jsonb blob with no
// server-side schema, so THIS FILE is the single source of truth for the
// shape of that blob. Keep it consistent: every consumer (the messaging
// settings page today, anything else later) merges partial server data over
// DEFAULT_MESSAGING_SETTINGS below, so a brand-new user (whose row starts as
// `{}`) always gets a fully-populated, sensible settings object back.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type NotificationsSettings = {
  inApp: boolean;
  browser: boolean;
  /** 'off' or a "HH:MM-HH:MM" range in the user's local time. */
  quietHours: string;
  notifyFor: 'all_messages' | 'mentions_dms' | 'mentions_only' | 'nothing';
};

export type EmailAlertsSettings = {
  enabled: boolean;
  digestFrequency: 'realtime' | 'daily' | 'weekly' | 'off';
  includePreviews: boolean;
  newMessageEmails: 'all_conversations' | 'unread_only' | 'off';
};

export type PushSettings = {
  mobileEnabled: boolean;
  notifyFor: 'all_messages' | 'direct_messages' | 'mentions_only' | 'nothing';
  vibrate: boolean;
  criticalAlerts: 'always' | 'when_dnd_off' | 'never';
};

export type DesktopSoundsSettings = {
  enabled: boolean;
  sound: 'chime' | 'ping' | 'pop' | 'none';
  volume: 'low' | 'medium' | 'high';
  playForMentions: boolean;
};

export type AvailabilitySettings = {
  showStatus: boolean;
  statusDisplay: 'to_all_contacts' | 'connections_only' | 'hidden';
  customStatus: string;
};

export type ReadReceiptsSettings = {
  send: boolean;
  visibility: 'everyone' | 'connections_only' | 'nobody';
};

export type TypingIndicatorsSettings = {
  show: boolean;
  showForGroupChats: boolean;
};

export type MessageRequestsSettings = {
  filterUnknown: boolean;
  moveTo: 'requests' | 'inbox' | 'archive';
  spamThreshold: 'low' | 'medium' | 'high';
};

export type RetentionSettings = {
  period: '30_days' | '90_days' | '1_year' | '2_years' | 'forever';
  applyTo: 'all_conversations' | 'direct_messages_only' | 'group_chats_only';
};

export type FileSharingSettings = {
  whoCanSend: 'all_users' | 'connections_only' | 'nobody';
  sizeLimit: '10mb' | '25mb' | '100mb' | '500mb';
  fileTypes: 'all_types' | 'documents_images' | 'images_only';
};

export type CallDefaultsSettings = {
  defaultVideoOn: boolean;
  defaultMicrophone: 'system_default' | 'muted';
  defaultQuality: 'auto_hd' | 'standard' | 'data_saver';
};

export type SmartRepliesSettings = {
  enabled: boolean;
  tone: 'professional' | 'casual' | 'friendly';
  suggestionLength: 'short' | 'medium' | 'long';
};

export type ConversationSummariesSettings = {
  enabled: boolean;
  autoSummarizeLongThreads: boolean;
  minMessages: '8' | '15' | '25' | '50';
  summaryLength: 'short' | 'medium' | 'detailed';
};

export type AiDraftingSettings = {
  enabled: boolean;
  defaultTone: 'friendly' | 'professional' | 'concise';
  includeContextFromThread: boolean;
  confirmBeforeSending: boolean;
};

export type AbuseDetectionSettings = {
  sensitivity: 'low' | 'medium' | 'high';
  detectSpam: boolean;
  detectThreats: boolean;
  detectHarassment: boolean;
};

export type ModerationReviewSettings = {
  autoFlagMessages: boolean;
  requireManualReview: boolean;
};

export type PrivacyControlsSettings = {
  encryptMessages: 'end_to_end' | 'standard' | 'off';
  hideOnlineStatus: boolean;
  allowLinkPreviews: boolean;
};

export type EnterpriseComplianceSettings = {
  dlpEnabled: boolean;
  ediscoveryHold: boolean;
  auditLogging: boolean;
  retentionPolicyYears: '1' | '3' | '7' | 'indefinite';
};

export type MessagingSettings = {
  notifications: NotificationsSettings;
  emailAlerts: EmailAlertsSettings;
  push: PushSettings;
  desktopSounds: DesktopSoundsSettings;
  availability: AvailabilitySettings;
  readReceipts: ReadReceiptsSettings;
  typingIndicators: TypingIndicatorsSettings;
  messageRequests: MessageRequestsSettings;
  retention: RetentionSettings;
  fileSharing: FileSharingSettings;
  callDefaults: CallDefaultsSettings;
  smartReplies: SmartRepliesSettings;
  conversationSummaries: ConversationSummariesSettings;
  aiDrafting: AiDraftingSettings;
  abuseDetection: AbuseDetectionSettings;
  moderationReview: ModerationReviewSettings;
  privacyControls: PrivacyControlsSettings;
  enterpriseCompliance: EnterpriseComplianceSettings;
};

export const DEFAULT_MESSAGING_SETTINGS: MessagingSettings = {
  notifications: {
    inApp: true,
    browser: true,
    quietHours: '22:00-07:00',
    notifyFor: 'mentions_dms',
  },
  emailAlerts: {
    enabled: true,
    digestFrequency: 'daily',
    includePreviews: true,
    newMessageEmails: 'all_conversations',
  },
  push: {
    mobileEnabled: true,
    notifyFor: 'direct_messages',
    vibrate: true,
    criticalAlerts: 'always',
  },
  desktopSounds: {
    enabled: true,
    sound: 'chime',
    volume: 'medium',
    playForMentions: true,
  },
  availability: {
    showStatus: true,
    statusDisplay: 'to_all_contacts',
    customStatus: '',
  },
  readReceipts: {
    send: true,
    visibility: 'everyone',
  },
  typingIndicators: {
    show: true,
    showForGroupChats: true,
  },
  messageRequests: {
    filterUnknown: true,
    moveTo: 'requests',
    spamThreshold: 'medium',
  },
  retention: {
    period: '2_years',
    applyTo: 'all_conversations',
  },
  fileSharing: {
    whoCanSend: 'all_users',
    sizeLimit: '100mb',
    fileTypes: 'all_types',
  },
  callDefaults: {
    defaultVideoOn: true,
    defaultMicrophone: 'system_default',
    defaultQuality: 'auto_hd',
  },
  smartReplies: {
    enabled: true,
    tone: 'professional',
    suggestionLength: 'medium',
  },
  conversationSummaries: {
    enabled: true,
    autoSummarizeLongThreads: true,
    minMessages: '8',
    summaryLength: 'short',
  },
  aiDrafting: {
    enabled: true,
    defaultTone: 'friendly',
    includeContextFromThread: true,
    confirmBeforeSending: true,
  },
  abuseDetection: {
    sensitivity: 'medium',
    detectSpam: true,
    detectThreats: true,
    detectHarassment: true,
  },
  moderationReview: {
    autoFlagMessages: true,
    requireManualReview: true,
  },
  privacyControls: {
    encryptMessages: 'end_to_end',
    hideOnlineStatus: false,
    allowLinkPreviews: true,
  },
  enterpriseCompliance: {
    dlpEnabled: false,
    ediscoveryHold: false,
    auditLogging: false,
    retentionPolicyYears: '7',
  },
};

export const MESSAGING_SETTINGS_QUERY_KEY = ['messaging-settings'] as const;

/** Deep-merges a partial (possibly empty, possibly missing sections) server
 * blob over the full defaults, one section at a time, so a partially-filled
 * jsonb row never leaves a field `undefined`. */
function mergeWithDefaults(partial: Partial<MessagingSettings> | null | undefined): MessagingSettings {
  const merged = { ...DEFAULT_MESSAGING_SETTINGS };
  if (!partial || typeof partial !== 'object') return merged;
  (Object.keys(DEFAULT_MESSAGING_SETTINGS) as Array<keyof MessagingSettings>).forEach((key) => {
    const section = partial[key];
    if (section && typeof section === 'object') {
      merged[key] = { ...merged[key], ...section } as never;
    }
  });
  return merged;
}

/** Fetches the current user's messaging settings, merged over sensible
 * defaults. Degrades gracefully to all-defaults on any failure (missing
 * row, network error) instead of throwing, matching the pattern used by
 * useEntitlements / useMessageRequests. */
export function useMessagingSettings() {
  return useQuery({
    queryKey: MESSAGING_SETTINGS_QUERY_KEY,
    queryFn: async (): Promise<MessagingSettings> => {
      try {
        const { data } = await api.get<{ data: Partial<MessagingSettings> }>('/messaging-settings');
        return mergeWithDefaults(data?.data);
      } catch {
        return mergeWithDefaults(null);
      }
    },
    retry: false,
    throwOnError: false,
  });
}

/** Autosaves a partial patch (one or more sections, each partial) by
 * shallow-merging it server-side and updating the cache optimistically so
 * every control in the settings page reflects the change immediately, with
 * automatic rollback if the PATCH fails. */
export function useUpdateMessagingSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: Partial<MessagingSettings>) => {
      const { data } = await api.patch<{ data: Partial<MessagingSettings> }>('/messaging-settings', patch);
      return mergeWithDefaults(data?.data);
    },
    onMutate: async (patch: Partial<MessagingSettings>) => {
      await queryClient.cancelQueries({ queryKey: MESSAGING_SETTINGS_QUERY_KEY });
      const previous = queryClient.getQueryData<MessagingSettings>(MESSAGING_SETTINGS_QUERY_KEY);
      const base = previous ?? DEFAULT_MESSAGING_SETTINGS;
      const optimistic = { ...base };
      (Object.keys(patch) as Array<keyof MessagingSettings>).forEach((key) => {
        const section = patch[key];
        if (section && typeof section === 'object') {
          optimistic[key] = { ...base[key], ...section } as never;
        }
      });
      queryClient.setQueryData(MESSAGING_SETTINGS_QUERY_KEY, optimistic);
      return { previous };
    },
    onError: (_err, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(MESSAGING_SETTINGS_QUERY_KEY, context.previous);
      }
    },
    onSuccess: (merged) => {
      queryClient.setQueryData(MESSAGING_SETTINGS_QUERY_KEY, merged);
    },
  });
}
