import { fileTypeFromBuffer } from 'file-type';
import { AppError } from '../common/errors/AppError.js';

/**
 * Server-side allowlists per import type (Domain 04 §29). The client's
 * declared MIME/extension is never trusted alone — the detected magic-byte
 * signature must agree with it, or the upload is rejected before scanning.
 */
export const IMPORT_TYPE_ALLOWLISTS = {
  cv: {
    extensions: ['pdf', 'docx', 'doc', 'txt'],
    mimeTypes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
    ],
  },
  profile: {
    extensions: ['pdf', 'docx', 'doc', 'txt'],
    mimeTypes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
    ],
  },
  company: {
    extensions: ['csv', 'xlsx'],
    mimeTypes: [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
  },
  contacts: {
    extensions: ['csv', 'xlsx', 'vcf'],
    mimeTypes: [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/vcard',
      'text/x-vcard',
    ],
  },
};

// file-type cannot detect a magic-byte signature for plain-text formats
// (txt, csv, vcf) — those are validated by extension/declared-MIME + a
// UTF-8/ASCII decodability check instead of a byte signature.
const TEXTUAL_EXTENSIONS = new Set(['txt', 'csv', 'vcf']);

export function getAllowlist(importType) {
  const allowlist = IMPORT_TYPE_ALLOWLISTS[importType];
  if (!allowlist) throw new AppError(`Unsupported import type: ${importType}`, 422);
  return allowlist;
}

function looksLikeValidUtf8OrAscii(buffer) {
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    decoder.decode(buffer.subarray(0, Math.min(buffer.length, 65536)));
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates a buffer against the declared MIME/extension for the given
 * import type. Throws AppError(422) on any mismatch or disallowed type.
 * Returns { detectedMime, detectedExt, isTextual }.
 */
export async function validateFileBuffer({ buffer, declaredMimeType, filename, importType }) {
  const allowlist = getAllowlist(importType);
  const ext = (/\.([a-zA-Z0-9]+)$/.exec(filename || '')?.[1] || '').toLowerCase();

  if (!allowlist.extensions.includes(ext)) {
    throw new AppError(`File extension .${ext || '?'} is not allowed for ${importType} imports`, 422, {
      code: 'EXTENSION_NOT_ALLOWED',
    });
  }

  if (declaredMimeType && !allowlist.mimeTypes.includes(declaredMimeType) && !TEXTUAL_EXTENSIONS.has(ext)) {
    throw new AppError(`Declared content type ${declaredMimeType} is not allowed for ${importType} imports`, 422, {
      code: 'MIME_NOT_ALLOWED',
    });
  }

  if (TEXTUAL_EXTENSIONS.has(ext)) {
    if (!looksLikeValidUtf8OrAscii(buffer)) {
      throw new AppError('File does not appear to be valid text content', 422, { code: 'NOT_TEXTUAL' });
    }
    return { detectedMime: declaredMimeType || 'text/plain', detectedExt: ext, isTextual: true };
  }

  const detected = await fileTypeFromBuffer(buffer);
  if (!detected) {
    throw new AppError('Could not verify file signature', 422, { code: 'SIGNATURE_UNKNOWN' });
  }
  if (!allowlist.mimeTypes.includes(detected.mime) && !allowlist.extensions.includes(detected.ext)) {
    throw new AppError(`Detected file signature (${detected.mime}) does not match an allowed type`, 422, {
      code: 'SIGNATURE_NOT_ALLOWED',
    });
  }
  if (declaredMimeType && detected.mime !== declaredMimeType) {
    // Declared/detected mismatch is exactly the spoofing pattern this check exists to catch.
    throw new AppError('Declared content type does not match the file signature', 422, {
      code: 'MIME_SIGNATURE_MISMATCH',
      declared: declaredMimeType,
      detected: detected.mime,
    });
  }

  return { detectedMime: detected.mime, detectedExt: detected.ext, isTextual: false };
}
