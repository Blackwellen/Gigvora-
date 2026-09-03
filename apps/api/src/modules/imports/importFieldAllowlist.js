/**
 * Server-side whitelist of canonical target fields per import_type (Domain
 * 04 — "Import mapping target fields must come from a server-side
 * whitelist... never accept arbitrary column names from the client"). Both
 * the automatic mapper (importMap.worker.js) and the manual PATCH mapping
 * endpoint validate against this — an unknown target_field is rejected.
 */
export const TARGET_FIELDS_BY_IMPORT_TYPE = {
  contacts: [
    'first_name',
    'last_name',
    'email',
    'phone',
    'company_name',
    'title',
    'location',
    'tags',
  ],
  company: [
    'name',
    'domain',
    'industry',
    'size',
    'location',
    'website',
    'description',
    'logo_url',
  ],
  cv: [
    'name',
    'headline',
    'summary',
    'email',
    'phone',
    'location',
    'skills',
    'experience',
    'education',
    'certifications',
    'projects',
    'languages',
    'links',
  ],
  profile: [
    'name',
    'headline',
    'summary',
    'email',
    'phone',
    'location',
    'skills',
    'experience',
    'education',
    'links',
  ],
};

// Deterministic header-text -> target-field matcher used when the ML mapper
// is unavailable (or for the initial suggestion pass regardless — a rule
// pass always runs so provenance can be honestly 'rule-based-v1').
const HEADER_SYNONYMS = {
  first_name: ['first name', 'firstname', 'given name', 'fname'],
  last_name: ['last name', 'lastname', 'surname', 'family name', 'lname'],
  email: ['email', 'e-mail', 'email address', 'work email'],
  phone: ['phone', 'telephone', 'mobile', 'phone number', 'cell'],
  company_name: ['company', 'company name', 'organization', 'organisation', 'employer'],
  title: ['title', 'job title', 'role', 'position'],
  location: ['location', 'city', 'address', 'region'],
  tags: ['tags', 'labels', 'segment'],
  name: ['name', 'full name'],
  domain: ['domain', 'website domain', 'url'],
  industry: ['industry', 'sector', 'vertical'],
  size: ['size', 'company size', 'employees', 'headcount'],
  website: ['website', 'site', 'url', 'web address'],
  description: ['description', 'about', 'summary'],
  logo_url: ['logo', 'logo url'],
};

function normalizeHeader(header) {
  return String(header || '')
    .toLowerCase()
    .replace(/[_\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Suggests a target field for a source column header via exact/synonym
 * text matching against the allowlist for the given import type. Returns
 * { targetField, confidence } — targetField is null if nothing matched.
 */
export function suggestTargetFieldForHeader(header, importType) {
  const allowlist = TARGET_FIELDS_BY_IMPORT_TYPE[importType] || [];
  const normalized = normalizeHeader(header);
  if (!normalized) return { targetField: null, confidence: 0 };

  for (const field of allowlist) {
    if (normalizeHeader(field) === normalized) return { targetField: field, confidence: 0.95 };
  }

  for (const field of allowlist) {
    const synonyms = HEADER_SYNONYMS[field] || [];
    if (synonyms.some((s) => normalizeHeader(s) === normalized)) return { targetField: field, confidence: 0.85 };
  }

  for (const field of allowlist) {
    const synonyms = [field, ...(HEADER_SYNONYMS[field] || [])];
    if (synonyms.some((s) => normalized.includes(normalizeHeader(s)) || normalizeHeader(s).includes(normalized))) {
      return { targetField: field, confidence: 0.55 };
    }
  }

  return { targetField: null, confidence: 0 };
}

export function isValidTargetField(targetField, importType) {
  if (targetField === null || targetField === undefined) return true; // "unmapped" is always valid
  return (TARGET_FIELDS_BY_IMPORT_TYPE[importType] || []).includes(targetField);
}
