/**
 * Display labels only — purely cosmetic UI copy. The actual target-field
 * allowlist is server-authoritative: fetched live via useTargetFields()
 * (GET /imports/target-fields/:importType), which reads the exact same
 * TARGET_FIELDS_BY_IMPORT_TYPE object PATCH /imports/:id/mappings validates
 * against (apps/api/src/modules/imports/importFieldAllowlist.js). A field
 * missing a label here just falls back to its raw key — never blocks or
 * misrepresents the allowlist itself.
 */
export const TARGET_FIELD_LABELS: Record<string, string> = {
  first_name: 'First name',
  last_name: 'Last name',
  email: 'Email',
  phone: 'Phone',
  company_name: 'Company name',
  title: 'Title',
  location: 'Location',
  tags: 'Tags',
  name: 'Name',
  domain: 'Domain',
  industry: 'Industry',
  size: 'Company size',
  website: 'Website',
  description: 'Description',
  logo_url: 'Logo URL',
  headline: 'Headline',
  summary: 'Summary',
  skills: 'Skills',
  experience: 'Experience',
  education: 'Education',
  certifications: 'Certifications',
  projects: 'Projects',
  languages: 'Languages',
  links: 'Links',
};
