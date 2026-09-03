// Domain 04 §41-43 follow-up: real per-track step catalogs for the 9 role
// wizards (04.01-04.09). onboarding_steps.schema_json follows the minimal,
// server-authoritative shape consumed by validateStepResponse() in
// onboarding.validation.js: { fields: [{ key, type, required, ...meta }] }
// where type is one of 'string' | 'number' | 'boolean' | 'array' | 'object'.
// This is NOT full JSON-Schema — it's the flat shape the validator actually
// parses. Extra keys (label, inputType, options, placeholder) are ignored by
// the validator but are read by the frontend to render the right control
// (select, multiselect, tel, email, textarea, tag-list, etc).
//
// A step with is_required=false is either read-only display (invitee's
// invitation_details/workspace_role/team_permissions, which mirror a
// server-owned company_members row rather than collecting input) and its
// schema_json.fields is intentionally [].

function f(key, type, required, label, extra = {}) {
  return { key, type, required, label, ...extra };
}

const str = (key, label, required = false, extra = {}) => f(key, 'string', required, label, extra);
const num = (key, label, required = false, extra = {}) => f(key, 'number', required, label, extra);
const bool = (key, label, required = false, extra = {}) => f(key, 'boolean', required, label, extra);
const arr = (key, label, required = false, extra = {}) => f(key, 'array', required, label, extra);
const obj = (key, label, required = false, extra = {}) => f(key, 'object', required, label, extra);

const select = (options) => ({ inputType: 'select', options });
const multiselect = (options) => ({ inputType: 'multiselect', options });
const email = { inputType: 'email' };
const tel = { inputType: 'tel' };
const textarea = { inputType: 'textarea' };
const url = { inputType: 'url' };

const TIMEZONES = ['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Europe/Paris', 'Africa/Lagos', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney', 'Other'];
const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+'];

const TRACKS = [
  {
    track: 'professional',
    steps: [
      {
        key: 'profile_basics',
        title: 'Profile Basics',
        description: 'Tell us who you are so recruiters and collaborators can find you.',
        fields: [
          str('fullName', 'Full name', true),
          str('email', 'Email', true, email),
          str('phone', 'Phone', false, tel),
          str('timezone', 'Timezone', true, select(TIMEZONES)),
          str('currentTitle', 'Current title', true),
          num('yearsExperience', 'Years of experience', true),
          str('currentCompany', 'Current company', false),
          str('companySize', 'Company size', false, select(COMPANY_SIZES)),
          str('primaryLocation', 'Primary location', true),
          str('workAuthorization', 'Work authorization', true, select(['citizen', 'permanent_resident', 'visa_sponsored', 'requires_sponsorship', 'other'])),
        ],
      },
      {
        key: 'headline_summary',
        title: 'Headline & Summary',
        description: 'A short headline and summary that appear across your profile.',
        fields: [str('headline', 'Headline', true), str('summary', 'Summary', true, textarea), bool('openToWork', 'Open to work', false)],
      },
      {
        key: 'skills_expertise',
        title: 'Skills & Expertise',
        description: 'The skills that best represent your expertise.',
        fields: [arr('skills', 'Skills', true, { inputType: 'tags' }), str('topSkill', 'Top skill', false), arr('certifications', 'Certifications', false, { inputType: 'tags' })],
      },
      {
        key: 'experience_highlights',
        title: 'Experience Highlights',
        description: 'Your recent roles, most recent first.',
        fields: [arr('experience', 'Experience', true, { inputType: 'repeater', itemShape: ['title', 'company', 'startDate', 'endDate', 'description'] }), bool('currentlyEmployed', 'Currently employed', false)],
      },
      {
        key: 'work_preferences',
        title: 'Work Preferences',
        description: 'How and where you like to work.',
        fields: [
          str('workArrangement', 'Work arrangement', true, select(['remote', 'hybrid', 'onsite'])),
          arr('employmentTypes', 'Employment types', true, multiselect(['full_time', 'part_time', 'contract', 'freelance', 'internship'])),
          bool('relocationWillingness', 'Willing to relocate', false),
          str('desiredSalaryRange', 'Desired salary range', false),
        ],
      },
      {
        key: 'opportunity_preferences',
        title: 'Opportunity Preferences',
        description: 'The kind of opportunities you want to see.',
        fields: [arr('industriesOfInterest', 'Industries of interest', true, { inputType: 'tags' }), str('roleLevel', 'Role level', true, select(['entry', 'mid', 'senior', 'lead', 'executive'])), arr('companySizePreference', 'Company size preference', false, multiselect(COMPANY_SIZES))],
      },
      {
        key: 'availability_engagement',
        title: 'Availability & Engagement',
        description: 'When you can start and how much time you have.',
        fields: [str('availability', 'Availability', true, select(['immediately', '2_weeks', '1_month', 'not_looking'])), num('hoursPerWeek', 'Hours per week', false), num('noticePeriodDays', 'Notice period (days)', false)],
      },
      {
        key: 'networking_goals',
        title: 'Networking Goals',
        description: 'What you want to get out of Gigvora.',
        fields: [arr('goals', 'Goals', true, multiselect(['find_job', 'grow_network', 'mentorship', 'freelance_gigs', 'hire_talent'])), arr('lookingToConnectWith', 'Looking to connect with', false, { inputType: 'tags' })],
      },
      {
        key: 'review_confirm',
        title: 'Review & Confirm',
        description: 'Review your answers before finishing setup.',
        fields: [bool('confirmed', 'I confirm the above is accurate', true), str('notes', 'Anything else?', false, textarea)],
      },
    ],
  },
  {
    track: 'business',
    steps: [
      {
        key: 'company_basics',
        title: 'Company Basics',
        description: 'The essentials about your company.',
        fields: [
          str('companyName', 'Company name', true),
          str('businessEmail', 'Business email', true, email),
          str('phone', 'Phone', false, tel),
          str('timezone', 'Timezone', true, select(TIMEZONES)),
          str('industry', 'Industry', true),
          str('companySize', 'Company size', true, select(COMPANY_SIZES)),
          str('headOfficeLocation', 'Head office location', true),
          str('websiteUrl', 'Website URL', false, url),
          str('primaryUseCase', 'Primary use case', true, select(['hiring', 'team_collaboration', 'client_management', 'freelancer_marketplace', 'other'])),
          num('teamSizeToInvite', 'Team size to invite', false),
          str('companyDescription', 'Company description', false, textarea),
        ],
      },
      {
        key: 'workspace_setup',
        title: 'Workspace Setup',
        description: 'Name and brand your workspace.',
        fields: [str('workspaceName', 'Workspace name', true), str('logoUrl', 'Logo URL', false, url), str('brandColor', 'Brand color', false), str('defaultTimezone', 'Default timezone', false, select(TIMEZONES))],
      },
      {
        key: 'team_members_roles',
        title: 'Team Members & Roles',
        description: 'Invite teammates to your workspace.',
        fields: [arr('invitees', 'Invitee emails', false, { inputType: 'tags' }), str('defaultRole', 'Default role for invites', false, select(['admin', 'recruiter', 'member', 'viewer']))],
      },
      {
        key: 'hiring_goals',
        title: 'Hiring Goals',
        description: 'What you are trying to achieve.',
        fields: [num('openRoles', 'Open roles', false), str('hiringUrgency', 'Hiring urgency', false, select(['immediate', 'this_quarter', 'ongoing', 'not_hiring_yet'])), arr('targetRoleTypes', 'Target role types', false, { inputType: 'tags' })],
      },
      {
        key: 'brand_presence',
        title: 'Brand Presence',
        description: 'How your company shows up.',
        fields: [str('companyLogo', 'Company logo URL', false, url), str('companyBannerUrl', 'Banner URL', false, url), obj('socialLinks', 'Social links', false, { inputType: 'link-map' })],
      },
      {
        key: 'services_operations',
        title: 'Services & Operations',
        description: 'What you offer and where you operate.',
        fields: [arr('servicesOffered', 'Services offered', false, { inputType: 'tags' }), arr('operatingRegions', 'Operating regions', false, { inputType: 'tags' })],
      },
      {
        key: 'billing_permissions',
        title: 'Billing & Permissions',
        description: 'Set up billing for your workspace.',
        fields: [str('billingEmail', 'Billing email', true, email), str('planSelected', 'Plan', true, select(['standard', 'pro', 'enterprise'])), bool('paymentMethodOnFile', 'Payment method on file', false)],
      },
      {
        key: 'integrations_preferences',
        title: 'Integrations & Preferences',
        description: 'Connect the tools your team already uses.',
        fields: [arr('integrations', 'Integrations', false, multiselect(['slack', 'google_workspace', 'microsoft_teams', 'ats', 'none'])), bool('notifyByEmail', 'Notify by email', false)],
      },
      {
        key: 'review_confirm',
        title: 'Review & Confirm',
        description: 'Review your answers before creating your workspace.',
        fields: [bool('confirmed', 'I confirm the above is accurate', true)],
      },
    ],
  },
  {
    track: 'agency',
    steps: [
      {
        key: 'agency_basics',
        title: 'Agency Basics',
        description: 'The essentials about your agency.',
        fields: [
          str('agencyName', 'Agency name', true),
          str('businessEmail', 'Business email', true, email),
          str('phone', 'Phone', false, tel),
          str('timezone', 'Timezone', true, select(TIMEZONES)),
          str('agencyType', 'Agency type', true, select(['staffing', 'recruiting', 'creative', 'consulting', 'marketing', 'other'])),
          str('companySize', 'Company size', false, select(COMPANY_SIZES)),
          str('headOfficeLocation', 'Head office location', true),
          str('websiteUrl', 'Website URL', false, url),
        ],
      },
      {
        key: 'services_specialisms',
        title: 'Services & Specialisms',
        description: 'What your agency specialises in.',
        fields: [arr('servicesOffered', 'Services offered', true, { inputType: 'tags' }), arr('industriesServed', 'Industries served', false, { inputType: 'tags' }), arr('specialisms', 'Specialisms', false, { inputType: 'tags' })],
      },
      {
        key: 'team_structure',
        title: 'Team Structure',
        description: 'How your team is organised.',
        fields: [num('teamSize', 'Team size', false), arr('departments', 'Departments', false, { inputType: 'tags' })],
      },
      {
        key: 'client_accounts',
        title: 'Client Accounts',
        description: 'Your current client roster.',
        fields: [num('activeClientsCount', 'Active clients', false), arr('clientNames', 'Client names', false, { inputType: 'tags' })],
      },
      {
        key: 'delivery_workflow',
        title: 'Delivery Workflow',
        description: 'How work moves through your agency.',
        fields: [arr('workflowStages', 'Workflow stages', false, { inputType: 'tags' }), num('averageDeliveryDays', 'Average delivery time (days)', false)],
      },
      {
        key: 'talent_pool_rates',
        title: 'Talent Pool & Rates',
        description: 'Your talent pool and typical rates.',
        fields: [num('talentPoolSize', 'Talent pool size', false), num('averageHourlyRate', 'Average hourly rate', false), str('rateCurrency', 'Currency', false, select(['USD', 'GBP', 'EUR', 'other']))],
      },
      {
        key: 'brand_assets',
        title: 'Brand Assets',
        description: 'Your agency logo and brand colour.',
        fields: [str('agencyLogoUrl', 'Logo URL', false, url), str('brandColor', 'Brand color', false)],
      },
      {
        key: 'integrations_permissions',
        title: 'Integrations & Permissions',
        description: 'Connect tools and set default access.',
        fields: [arr('integrations', 'Integrations', false, { inputType: 'tags' }), str('defaultMemberRole', 'Default member role', false, select(['admin', 'recruiter', 'member', 'viewer']))],
      },
      {
        key: 'review_confirm',
        title: 'Review & Confirm',
        description: 'Review your answers before creating your workspace.',
        fields: [bool('confirmed', 'I confirm the above is accurate', true)],
      },
    ],
  },
  {
    track: 'enterprise',
    steps: [
      {
        key: 'organisation_basics',
        title: 'Organisation Basics',
        description: 'The essentials about your organisation.',
        fields: [
          str('organisationName', 'Organisation name', true),
          str('businessEmail', 'Business email', true, email),
          str('phone', 'Phone', false, tel),
          str('timezone', 'Timezone', true, select(TIMEZONES)),
          str('industry', 'Industry', true),
          str('employeeCount', 'Employee count', true, select(['1000-5000', '5001-10000', '10001-50000', '50000+'])),
          str('headOfficeLocation', 'Head office location', true),
          str('websiteUrl', 'Website URL', false, url),
        ],
      },
      {
        key: 'departments_structure',
        title: 'Departments & Structure',
        description: 'How your organisation is structured.',
        fields: [arr('departments', 'Departments', true, { inputType: 'tags' }), arr('regions', 'Regions', false, { inputType: 'tags' })],
      },
      {
        key: 'identity_sso',
        title: 'Identity & SSO',
        description: 'Tell us your identity provider intent. This captures your stated preference only — enabling SSO/SCIM is a follow-up configuration step handled outside onboarding.',
        fields: [str('ssoProvider', 'SSO provider', true, select(['none', 'okta', 'azure_ad', 'google_workspace'])), bool('planToEnableScim', 'Plan to enable SCIM provisioning', false), str('ssoContactEmail', 'SSO technical contact email', false, email)],
      },
      {
        key: 'security_compliance',
        title: 'Security & Compliance',
        description: 'Your compliance requirements. This records stated intent only — no controls are provisioned by this step.',
        fields: [arr('complianceStandardsRequired', 'Compliance standards required', false, multiselect(['soc2', 'iso27001', 'gdpr', 'hipaa'])), str('dataResidencyRequirement', 'Data residency requirement', false, select(['none', 'us', 'eu', 'uk', 'other'])), bool('requiresMfa', 'Requires MFA for all members', false)],
      },
      {
        key: 'admin_roles',
        title: 'Admin Roles',
        description: 'Who will administer this workspace.',
        fields: [str('primaryAdminEmail', 'Primary admin email', true, email), arr('additionalAdmins', 'Additional admin emails', false, { inputType: 'tags' })],
      },
      {
        key: 'data_integrations',
        title: 'Data & Integrations',
        description: 'Systems you want to connect.',
        fields: [arr('integrationsNeeded', 'Integrations needed', false, { inputType: 'tags' }), str('hrisSystem', 'HRIS system', false)],
      },
      {
        key: 'collaboration_defaults',
        title: 'Collaboration Defaults',
        description: 'Default visibility and notification settings.',
        fields: [str('defaultWorkspaceVisibility', 'Default workspace visibility', false, select(['private', 'company_wide'])), str('defaultNotificationChannel', 'Default notification channel', false, select(['email', 'slack', 'teams']))],
      },
      {
        key: 'rollout_plan',
        title: 'Rollout Plan',
        description: 'Your plan for rolling this out to the organisation.',
        fields: [str('rolloutTimeline', 'Rollout timeline', false, select(['immediate', '30_days', '60_days', '90_days_plus'])), num('pilotGroupSize', 'Pilot group size', false), str('rolloutOwnerEmail', 'Rollout owner email', false, email)],
      },
      {
        key: 'review_confirm',
        title: 'Review & Confirm',
        description: 'Review your answers before creating your workspace.',
        fields: [bool('confirmed', 'I confirm the above is accurate', true)],
      },
    ],
  },
  {
    track: 'recruiter',
    steps: [
      {
        key: 'recruiter_basics',
        title: 'Recruiter Basics',
        description: 'The essentials about you.',
        fields: [
          str('fullName', 'Full name', true),
          str('businessEmail', 'Business email', true, email),
          str('phone', 'Phone', false, tel),
          str('timezone', 'Timezone', true, select(TIMEZONES)),
          str('agencyOrCompanyName', 'Agency or company name', false),
          str('recruitingFocus', 'Recruiting focus', true, select(['in_house', 'agency', 'freelance'])),
          num('yearsExperience', 'Years of experience', false),
          str('headline', 'Professional headline', false),
          str('bio', 'Bio', false, textarea),
        ],
      },
      {
        key: 'hiring_focus',
        title: 'Hiring Focus',
        description: 'What you recruit for.',
        fields: [arr('industriesRecruitingFor', 'Industries', true, { inputType: 'tags' }), arr('roleLevelsFocus', 'Role levels', false, multiselect(['entry', 'mid', 'senior', 'lead', 'executive'])), num('averageOpenRoles', 'Average open roles', false)],
      },
      {
        key: 'team_seats',
        title: 'Team Seats',
        description: 'Your team size and seats to invite.',
        fields: [num('teamSize', 'Team size', false), num('seatsToInvite', 'Seats to invite', false)],
      },
      {
        key: 'candidate_pipeline',
        title: 'Candidate Pipeline',
        description: 'Your current pipeline.',
        fields: [num('activeCandidatesCount', 'Active candidates', false), arr('pipelineStages', 'Pipeline stages', false, { inputType: 'tags' })],
      },
      {
        key: 'outreach_preferences',
        title: 'Outreach Preferences',
        description: 'How you like to reach candidates.',
        fields: [arr('outreachChannels', 'Outreach channels', false, multiselect(['email', 'linkedin', 'phone', 'sms'])), str('messagingTonePreference', 'Messaging tone', false, select(['formal', 'casual', 'friendly']))],
      },
      {
        key: 'company_branding',
        title: 'Company Branding',
        description: 'Your branding assets.',
        fields: [str('logoUrl', 'Logo URL', false, url), str('brandColor', 'Brand color', false)],
      },
      {
        key: 'integrations',
        title: 'Integrations',
        description: 'Tools you want to connect.',
        fields: [arr('integrations', 'Integrations', false, multiselect(['ats', 'linkedin_recruiter', 'slack', 'calendar']))],
      },
      {
        key: 'notifications_defaults',
        title: 'Notification Defaults',
        description: 'How you want to be notified.',
        fields: [bool('notifyNewApplicants', 'Notify on new applicants', false), bool('notifyMessages', 'Notify on new messages', false), str('digestFrequency', 'Digest frequency', false, select(['realtime', 'daily', 'weekly']))],
      },
      {
        key: 'review_confirm',
        title: 'Review & Confirm',
        description: 'Review your answers before finishing setup.',
        fields: [bool('confirmed', 'I confirm the above is accurate', true)],
      },
    ],
  },
  {
    track: 'creator',
    steps: [
      {
        key: 'creator_basics',
        title: 'Creator Basics',
        description: 'The essentials about you and your content.',
        fields: [
          str('displayName', 'Display name', true),
          str('email', 'Email', true, email),
          str('phone', 'Phone', false, tel),
          str('timezone', 'Timezone', true, select(TIMEZONES)),
          str('primaryPlatform', 'Primary platform', true, select(['youtube', 'tiktok', 'instagram', 'twitch', 'podcast', 'blog', 'other'])),
          str('bio', 'Bio', true, textarea),
        ],
      },
      {
        key: 'content_focus',
        title: 'Content Focus',
        description: 'What your content is about.',
        fields: [arr('contentCategories', 'Content categories', true, { inputType: 'tags' }), arr('contentFormats', 'Content formats', false, { inputType: 'tags' })],
      },
      {
        key: 'audience_reach',
        title: 'Audience & Reach',
        description: 'Your audience size and engagement.',
        fields: [num('audienceSize', 'Audience size', false), str('primaryAudienceRegion', 'Primary audience region', false), num('averageEngagementRate', 'Average engagement rate (%)', false)],
      },
      {
        key: 'portfolio_media_kit',
        title: 'Portfolio & Media Kit',
        description: 'Links to your work.',
        fields: [arr('portfolioLinks', 'Portfolio links', false, { inputType: 'tags' }), str('mediaKitUrl', 'Media kit URL', false, url)],
      },
      {
        key: 'brand_partnerships',
        title: 'Brand Partnerships',
        description: 'Your experience with brand deals.',
        fields: [bool('openToPartnerships', 'Open to brand partnerships', false), arr('pastBrandsWorkedWith', 'Past brands worked with', false, { inputType: 'tags' }), arr('preferredCategories', 'Preferred categories', false, { inputType: 'tags' })],
      },
      {
        key: 'monetisation_settings',
        title: 'Monetisation Settings',
        description: 'How you monetise your content.',
        fields: [arr('monetisationMethods', 'Monetisation methods', false, multiselect(['sponsorships', 'affiliate', 'subscriptions', 'merch', 'ads'])), num('minimumDealValue', 'Minimum deal value', false)],
      },
      {
        key: 'channels_links',
        title: 'Channels & Links',
        description: 'Your channels across platforms.',
        fields: [arr('channels', 'Channels', true, { inputType: 'repeater', itemShape: ['platform', 'url'] }), str('websiteUrl', 'Website URL', false, url)],
      },
      {
        key: 'preferences_permissions',
        title: 'Preferences & Permissions',
        description: 'How brands and collaborators can reach you.',
        fields: [bool('allowDirectBrandContact', 'Allow direct brand contact', false), bool('contentReviewRequired', 'Content review required before publishing', false)],
      },
      {
        key: 'review_confirm',
        title: 'Review & Confirm',
        description: 'Review your answers before finishing setup.',
        fields: [bool('confirmed', 'I confirm the above is accurate', true)],
      },
    ],
  },
  {
    track: 'graduate_student',
    steps: [
      {
        key: 'student_basics',
        title: 'Student Basics',
        description: 'The essentials about you.',
        fields: [str('fullName', 'Full name', true), str('email', 'Email', true, email), str('phone', 'Phone', false, tel), str('timezone', 'Timezone', true, select(TIMEZONES)), str('currentStatus', 'Current status', true, select(['student', 'recent_graduate']))],
      },
      {
        key: 'education',
        title: 'Education',
        description: 'Your school and programme.',
        fields: [str('institutionName', 'Institution name', true), str('degree', 'Degree', false), str('fieldOfStudy', 'Field of study', false), num('graduationYear', 'Graduation year', true)],
      },
      {
        key: 'skills_projects',
        title: 'Skills & Projects',
        description: 'What you can do and what you have built.',
        fields: [arr('skills', 'Skills', true, { inputType: 'tags' }), arr('projects', 'Projects', false, { inputType: 'repeater', itemShape: ['title', 'description', 'url'] })],
      },
      {
        key: 'experience_activities',
        title: 'Experience & Activities',
        description: 'Internships and extracurriculars.',
        fields: [arr('internships', 'Internships', false, { inputType: 'repeater', itemShape: ['title', 'company', 'startDate', 'endDate'] }), arr('extracurriculars', 'Extracurriculars', false, { inputType: 'tags' })],
      },
      {
        key: 'career_interests',
        title: 'Career Interests',
        description: 'What kind of roles you want.',
        fields: [arr('industriesOfInterest', 'Industries of interest', true, { inputType: 'tags' }), arr('desiredRoleTypes', 'Desired role types', false, { inputType: 'tags' })],
      },
      {
        key: 'availability',
        title: 'Availability',
        description: 'When you can start.',
        fields: [str('availability', 'Availability', false, select(['immediately', 'after_graduation', 'summer_internship'])), str('startDate', 'Earliest start date', false)],
      },
      {
        key: 'portfolio_links',
        title: 'Portfolio Links',
        description: 'Links to your work.',
        fields: [str('portfolioUrl', 'Portfolio URL', false, url), str('githubUrl', 'GitHub URL', false, url), str('linkedinUrl', 'LinkedIn URL', false, url)],
      },
      {
        key: 'recommendations',
        title: 'Recommendations',
        description: 'References who can vouch for you.',
        fields: [arr('referees', 'Referees', false, { inputType: 'repeater', itemShape: ['name', 'email', 'relationship'] }), bool('requestRecommendation', 'Request a recommendation letter', false)],
      },
      {
        key: 'review_confirm',
        title: 'Review & Confirm',
        description: 'Review your answers before finishing setup.',
        fields: [bool('confirmed', 'I confirm the above is accurate', true)],
      },
    ],
  },
  {
    track: 'career_changer',
    steps: [
      {
        key: 'transition_basics',
        title: 'Transition Basics',
        description: 'The essentials about your career change.',
        fields: [str('fullName', 'Full name', true), str('email', 'Email', true, email), str('phone', 'Phone', false, tel), str('timezone', 'Timezone', true, select(TIMEZONES)), str('currentIndustry', 'Current industry', false), str('targetIndustry', 'Target industry', true)],
      },
      {
        key: 'previous_experience',
        title: 'Previous Experience',
        description: 'Your background before this transition.',
        fields: [num('yearsExperience', 'Years of experience', false), arr('previousRoles', 'Previous roles', false, { inputType: 'repeater', itemShape: ['title', 'company', 'startDate', 'endDate'] })],
      },
      {
        key: 'transferable_skills',
        title: 'Transferable Skills',
        description: 'Skills that carry over to your new field.',
        fields: [arr('transferableSkills', 'Transferable skills', true, { inputType: 'tags' }), arr('softSkills', 'Soft skills', false, { inputType: 'tags' })],
      },
      {
        key: 'target_roles',
        title: 'Target Roles',
        description: 'The roles you are aiming for.',
        fields: [arr('targetRoles', 'Target roles', true, { inputType: 'tags' }), str('targetRoleLevel', 'Target role level', false, select(['entry', 'mid', 'senior']))],
      },
      {
        key: 'learning_certifications',
        title: 'Learning & Certifications',
        description: 'How you are preparing for the switch.',
        fields: [arr('certifications', 'Certifications', false, { inputType: 'tags' }), arr('coursesInProgress', 'Courses in progress', false, { inputType: 'tags' })],
      },
      {
        key: 'portfolio_proof',
        title: 'Portfolio & Proof of Work',
        description: 'Evidence of your new-field capability.',
        fields: [str('portfolioUrl', 'Portfolio URL', false, url), arr('caseStudies', 'Case studies', false, { inputType: 'repeater', itemShape: ['title', 'description', 'url'] })],
      },
      {
        key: 'availability_preferences',
        title: 'Availability & Preferences',
        description: 'When and how you want to work.',
        fields: [str('availability', 'Availability', false, select(['immediately', '2_weeks', '1_month'])), str('workArrangement', 'Work arrangement', false, select(['remote', 'hybrid', 'onsite']))],
      },
      {
        key: 'recommendations',
        title: 'Recommendations',
        description: 'References who can vouch for your transition.',
        fields: [arr('referees', 'Referees', false, { inputType: 'repeater', itemShape: ['name', 'email', 'relationship'] }), bool('requestRecommendation', 'Request a recommendation letter', false)],
      },
      {
        key: 'review_confirm',
        title: 'Review & Confirm',
        description: 'Review your answers before finishing setup.',
        fields: [bool('confirmed', 'I confirm the above is accurate', true)],
      },
    ],
  },
  {
    track: 'invitee',
    steps: [
      {
        key: 'invitation_details',
        title: 'Your Invitation',
        description: 'Read-only display of the workspace invitation that brought you here. Nothing to fill in — this mirrors your pending company_members record.',
        isRequired: false,
        fields: [],
      },
      {
        key: 'profile_basics',
        title: 'Profile Basics',
        description: 'Tell us who you are.',
        fields: [str('fullName', 'Full name', true), str('phone', 'Phone', false, tel), str('timezone', 'Timezone', true, select(TIMEZONES)), str('currentTitle', 'Current title', false)],
      },
      {
        key: 'workspace_role',
        title: 'Your Workspace Role',
        description: 'Read-only display of the role assigned to you by the workspace admin. Roles are never user-editable during onboarding.',
        isRequired: false,
        fields: [],
      },
      {
        key: 'team_permissions',
        title: 'Team Permissions',
        description: 'Read-only display of what your role can access in this workspace.',
        isRequired: false,
        fields: [],
      },
      {
        key: 'security_setup',
        title: 'Security Setup',
        description: 'Secure your account.',
        fields: [bool('enableMfa', 'Enable multi-factor authentication', true), str('recoveryEmail', 'Recovery email', false, email)],
      },
      {
        key: 'preferences',
        title: 'Preferences',
        description: 'Your display and notification preferences.',
        fields: [str('theme', 'Theme', false, select(['light', 'dark', 'system'])), str('notificationChannel', 'Preferred notification channel', false, select(['email', 'in_app', 'both']))],
      },
      {
        key: 'notifications',
        title: 'Notifications',
        description: 'What you want to be notified about.',
        fields: [bool('notifyByEmail', 'Notify by email', false), bool('notifyBySms', 'Notify by SMS', false)],
      },
      {
        key: 'review_confirm',
        title: 'Review & Confirm',
        description: 'Review your answers before joining the workspace.',
        fields: [bool('confirmed', 'I confirm the above is accurate', true)],
      },
    ],
  },
];

function buildRows() {
  const rows = [];
  for (const { track, steps } of TRACKS) {
    steps.forEach((step, index) => {
      rows.push({
        track,
        step_key: step.key,
        step_order: index + 1,
        title: step.title,
        description: step.description || null,
        schema_json: JSON.stringify({ fields: step.fields || [] }),
        is_required: step.isRequired === false ? false : true,
      });
    });
  }
  return rows;
}

export async function up(knex) {
  const rows = buildRows();
  await knex('onboarding_steps').insert(rows).onConflict(['track', 'step_key']).merge();
}

export async function down(knex) {
  const tracks = TRACKS.map((t) => t.track);
  await knex('onboarding_steps').whereIn('track', tracks).del();
}
