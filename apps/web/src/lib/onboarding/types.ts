/**
 * Types for the Domain 04 role onboarding wizards. Matches the server-authoritative
 * shape defined in apps/api/src/modules/onboarding/onboarding.validation.js:
 *
 *   schema_json = { fields: [{ key, type: 'string'|'number'|'boolean'|'array'|'object', required }] }
 *
 * The validator only checks `key`, `type`, and `required` — everything else on a
 * field (label, help, placeholder, options, inputType, multiline) is an optional,
 * non-validated presentation hint a step's seed data MAY include. OnboardingStepForm
 * falls back to humanizing `key` and inferring an input from `type` when those
 * hints are absent, so the renderer works against any schema_json the backend
 * seeds — it never hardcodes a track's fields.
 */

export type OnboardingFieldType = 'string' | 'number' | 'boolean' | 'array' | 'object';

export type OnboardingFieldOption = { value: string; label: string } | string;

export type OnboardingStepField = {
  key: string;
  type?: OnboardingFieldType;
  required?: boolean;
  /** Optional presentation hints — not validated server-side, used only if present. */
  label?: string;
  help?: string;
  placeholder?: string;
  options?: OnboardingFieldOption[];
  inputType?: 'text' | 'textarea' | 'select' | 'tags' | 'checkbox' | 'number' | 'email' | 'url' | 'date';
  multiline?: boolean;
  fullWidth?: boolean;
};

export type OnboardingStepSchema = {
  fields: OnboardingStepField[];
};

export type OnboardingStepConfig = {
  id: string;
  track: string;
  step_key: string;
  step_order: number;
  title: string;
  description: string | null;
  schema_json: OnboardingStepSchema;
  is_required: boolean;
  created_at: string;
  updated_at: string;
};

export type OnboardingTrackConfig = {
  track: string;
  steps: OnboardingStepConfig[];
};

export type OnboardingSessionStatus = 'in_progress' | 'completed' | 'abandoned';

export type OnboardingStepResponse = {
  id: string;
  session_id: string;
  step_key: string;
  response_json: Record<string, unknown>;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OnboardingSession = {
  id: string;
  user_id: string;
  company_id: string | null;
  track: string;
  status: OnboardingSessionStatus;
  current_step_key: string | null;
  context: Record<string, unknown>;
  started_at: string;
  completed_at: string | null;
  last_active_at: string;
  created_at: string;
  updated_at: string;
  responses: OnboardingStepResponse[];
};

export type SaveStepResult = {
  session: OnboardingSession;
  response: OnboardingStepResponse;
  nextStepKey: string | null;
};

/**
 * The `canonicalEntity` / `skippedInvites` fields are being added by the backend
 * agent extending POST /complete in parallel. They're typed optional here so this
 * frontend compiles and degrades gracefully (falls back to a generic success
 * screen) whether or not that work has landed yet when this ships.
 */
export type CompleteOnboardingResult = {
  session: OnboardingSession;
  canonicalEntity?: { type: string; id: string } | null;
  skippedInvites?: unknown[];
};

export const ONBOARDING_TRACKS = [
  'professional',
  'business',
  'agency',
  'enterprise',
  'recruiter',
  'creator',
  'graduate_student',
  'career_changer',
  'invitee',
] as const;

export type OnboardingTrack = (typeof ONBOARDING_TRACKS)[number];
