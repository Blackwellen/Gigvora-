// Job-application resume upload — same "request a signed PUT URL for a
// server-generated key -> client PUTs directly to storage -> complete/verify"
// contract as podcasts/media.service.js's requestUploadUrl/completeUpload.
// A resume isn't scoped to an existing owned entity (a show, a webinar) the
// way podcast media is — it's scoped to the authenticated user uploading
// their own resume, so the key lives under applications/${userId}/resumes/,
// never a caller-chosen path. The client never chooses the key, and
// completion is never trusted on the client's word alone — headObject()
// verifies the object actually landed in storage first.
import crypto from 'node:crypto';
import { AppError } from '../../common/errors/AppError.js';
import { getSignedUploadUrl, headObject, getSignedDownloadUrl } from '../../storage/s3.js';
import { config } from '../../config/index.js';

const MAX_RESUME_BYTES = 10 * 1024 * 1024; // 10MB ceiling for a resume document

const EXT_BY_CONTENT_TYPE = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

const WEEK_SECONDS = 7 * 24 * 60 * 60; // SigV4's max signed-URL lifetime

// Mirrors media.service.js's resolveAssetUrl: a configured publicUrl is used
// directly; otherwise (private R2 buckets with no public console URL) a
// long-lived signed GET URL stands in so the resume is still fetchable.
async function resolveAssetUrl(key) {
  const storageConfig = config.storage.active;
  if (storageConfig.publicUrl) return `${storageConfig.publicUrl}/${key}`;
  return getSignedDownloadUrl(key, WEEK_SECONDS);
}

function keyPrefixForUser(userId) {
  return `applications/${userId}/resumes/`;
}

export async function requestUploadUrl(userId, { contentType }) {
  if (!contentType || !EXT_BY_CONTENT_TYPE[contentType]) {
    throw new AppError('contentType must be one of: application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document', 422);
  }

  const ext = EXT_BY_CONTENT_TYPE[contentType];
  const key = `${keyPrefixForUser(userId)}${crypto.randomUUID()}/original.${ext}`;

  const uploadUrl = await getSignedUploadUrl({ key, contentType });
  const assetUrl = await resolveAssetUrl(key);

  return { uploadUrl, assetUrl, key, expiresInSeconds: 900 };
}

export async function completeUpload(userId, { key }) {
  if (!key || typeof key !== 'string' || !key.startsWith(keyPrefixForUser(userId))) {
    throw new AppError('Invalid or unrecognized storage key for this user', 422);
  }

  const head = await headObject(key);
  if (!head.exists) {
    throw new AppError('Uploaded object was not found in storage — upload may have failed', 422, { code: 'OBJECT_NOT_FOUND' });
  }
  if (head.sizeBytes > MAX_RESUME_BYTES) {
    throw new AppError('Uploaded file exceeds the maximum allowed size', 422, { code: 'SIZE_TOO_LARGE' });
  }

  const assetUrl = await resolveAssetUrl(key);

  return { assetUrl, sizeBytes: head.sizeBytes, contentType: head.contentType };
}
