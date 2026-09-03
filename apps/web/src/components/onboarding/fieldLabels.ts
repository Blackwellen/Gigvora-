/**
 * Humanizes an onboarding schema_json field key into a display label when the
 * field itself doesn't carry a `label`. Mirrors the intent of
 * apps/web/src/lib/imports/fieldAllowlist.ts's TARGET_FIELD_LABELS (a small
 * known-key map) but adds a generic snake_case/camelCase -> Title Case
 * fallback since onboarding fields span 9 tracks and aren't a fixed allowlist.
 */
const KNOWN_LABELS: Record<string, string> = {
  first_name: 'First name',
  last_name: 'Last name',
  full_name: 'Full name',
  email: 'Email',
  phone: 'Phone',
  headline: 'Headline',
  bio: 'Bio',
  summary: 'Summary',
  location: 'Location',
  timezone: 'Timezone',
  industry: 'Industry',
  skills: 'Skills',
  years_experience: 'Years of experience',
  current_title: 'Current title',
  current_employer: 'Current employer',
  linkedin_url: 'LinkedIn URL',
  portfolio_url: 'Portfolio URL',
  website: 'Website',
  company_name: 'Company name',
  company_size: 'Company size',
  legal_name: 'Legal name',
  domain: 'Domain',
  agency_name: 'Agency name',
  services_offered: 'Services offered',
  client_types: 'Client types',
  team_size: 'Team size',
  hiring_volume: 'Hiring volume',
  seniority_focus: 'Seniority focus',
  hiring_regions: 'Hiring regions',
  content_niche: 'Content niche',
  audience_size: 'Audience size',
  platforms: 'Platforms',
  school_name: 'School / university',
  degree: 'Degree',
  graduation_year: 'Graduation year',
  field_of_study: 'Field of study',
  target_roles: 'Target roles',
  previous_industry: 'Previous industry',
  target_industry: 'Target industry',
  transferable_skills: 'Transferable skills',
  invite_code: 'Invite code',
  goals: 'Goals',
  interests: 'Interests',
  availability: 'Availability',
  rate_expectation: 'Rate expectation',
  languages: 'Languages',
  certifications: 'Certifications',
};

export function humanizeFieldKey(key: string): string {
  if (KNOWN_LABELS[key]) return KNOWN_LABELS[key];
  const spaced = key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim();
  if (!spaced) return key;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}
