// Shared secure-upload pipeline for every Domain 14 asset (avatar, cover,
// portfolio media, certification attachments) — reuses the exact
// magic-byte + malware-scan pipeline already proven in modules/posts, rather
// than inventing a second one (§19, §60-61).
import { randomUUID } from 'crypto';
import { fileTypeFromBuffer } from 'file-type';
import { AppError } from '../../common/errors/AppError.js';
import { uploadObject } from '../../storage/s3.js';
import { scanBuffer } from '../../security/malwareScanner.js';

const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DOCUMENT_MIME = new Set(['application/pdf']);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;

export async function secureUpload(file, { kind, folder, userId }) {
  if (!file) throw new AppError('No file provided', 422);
  const allowed = kind === 'document' ? DOCUMENT_MIME : IMAGE_MIME;
  const maxBytes = kind === 'document' ? MAX_DOCUMENT_BYTES : MAX_IMAGE_BYTES;

  if (!allowed.has(file.mimetype)) throw new AppError('Unsupported file type', 422, { code: 'UNSUPPORTED_TYPE' });
  if (file.size > maxBytes) throw new AppError(`File exceeds ${Math.round(maxBytes / (1024 * 1024))}MB limit`, 422);

  const detected = await fileTypeFromBuffer(file.buffer);
  if (!detected || !allowed.has(detected.mime)) {
    throw new AppError('Could not verify file signature — rejecting a possible polyglot or mislabeled file', 422, { code: 'SIGNATURE_NOT_ALLOWED' });
  }
  if (detected.mime !== file.mimetype) {
    throw new AppError('Declared content type does not match the file signature', 422, { code: 'MIME_SIGNATURE_MISMATCH' });
  }

  const scanResult = await scanBuffer(file.buffer, { declaredAsDocument: kind === 'document' });
  if (scanResult.result !== 'clean') {
    throw new AppError('This file failed a security scan and cannot be uploaded', 422, { code: 'MALWARE_SCAN_FAILED', scanResult: scanResult.result });
  }

  const key = `professional-profile/${folder}/${userId}/${randomUUID()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const url = await uploadObject({ key, body: file.buffer, contentType: file.mimetype });
  return { key, url, mimeType: file.mimetype, sizeBytes: file.size };
}
