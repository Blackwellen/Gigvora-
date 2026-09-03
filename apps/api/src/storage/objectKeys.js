import crypto from 'node:crypto';

/**
 * Storage key prefixes used across the imports pipeline (Domain 04 §26).
 * A file lives under `quarantine/` until scan_status = 'clean', is moved
 * (logically, via a fresh key) into `sanitized/` once CDR runs, and
 * `rejected/` is used only for forensic retention of rejected uploads
 * (never served back to any client).
 */
export const KEY_PREFIXES = {
  quarantine: 'quarantine',
  imports: 'imports',
  sanitized: 'sanitized',
  rejected: 'rejected',
};

/**
 * Content-addressed, random internal storage key — never derived from the
 * original filename, so path traversal / weird-extension tricks in the
 * client-supplied name can never influence where the object lives.
 */
export function generateObjectKey(prefix, { ownerId, ext } = {}) {
  if (!KEY_PREFIXES[prefix]) throw new Error(`Unknown storage key prefix: ${prefix}`);
  const random = crypto.randomBytes(24).toString('hex');
  const shard = random.slice(0, 2); // fold into shard dirs to avoid huge flat prefixes
  const safeOwner = ownerId ? String(ownerId).replace(/[^a-zA-Z0-9-]/g, '') : 'anon';
  const safeExt = sanitizeExtension(ext);
  return `${KEY_PREFIXES[prefix]}/${shard}/${safeOwner}/${random}${safeExt}`;
}

function sanitizeExtension(ext) {
  if (!ext) return '';
  const cleaned = String(ext)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 8);
  return cleaned ? `.${cleaned}` : '';
}

const MAX_DISPLAY_NAME_LENGTH = 180;

function stripControlChars(input) {
  let out = '';
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    const isControl = (code >= 0 && code <= 31) || code === 127;
    if (!isControl) out += input[i];
  }
  return out;
}

/**
 * Produces a display-safe filename derived from a client-supplied original
 * filename: strips path separators, `..` traversal segments, control
 * characters, and clamps length. Never used to build a storage path.
 */
export function sanitizeDisplayName(originalFilename) {
  if (!originalFilename || typeof originalFilename !== 'string') return 'file';

  let name = stripControlChars(originalFilename)
    .replace(/[\\/]/g, '_')
    .replace(/\.\./g, '_')
    .trim();

  // Strip any remaining characters that have no business in a display name.
  name = name.replace(/[<>:"|?*]/g, '_');

  if (!name) name = 'file';
  if (name.length > MAX_DISPLAY_NAME_LENGTH) {
    const dot = name.lastIndexOf('.');
    const extPart = dot > 0 && name.length - dot <= 12 ? name.slice(dot) : '';
    name = name.slice(0, MAX_DISPLAY_NAME_LENGTH - extPart.length) + extPart;
  }
  return name;
}

export function extensionFromFilename(filename) {
  if (!filename) return '';
  const match = /\.([a-zA-Z0-9]+)$/.exec(filename);
  return match ? match[1].toLowerCase() : '';
}

export function sha256Hex(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}
