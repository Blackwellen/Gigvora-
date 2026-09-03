import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config/index.js';

// Provider is chosen via STORAGE_PROVIDER ('r2' | 's3', default 'r2' now
// that live Cloudflare R2 credentials exist). Both providers speak the S3
// API, so the same @aws-sdk/client-s3 client works for either — only the
// endpoint/region/credentials/bucket differ (config.storage.active resolves
// to whichever one is selected). Every exported function below keeps its
// existing signature so callers elsewhere in the codebase are unaffected.
const storageConfig = config.storage.active;

export const s3Client = new S3Client({
  endpoint: storageConfig.endpoint,
  region: storageConfig.region,
  forcePathStyle: storageConfig.forcePathStyle,
  credentials: {
    accessKeyId: storageConfig.accessKeyId,
    secretAccessKey: storageConfig.secretAccessKey,
  },
});

export async function uploadObject({ key, body, contentType }) {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: storageConfig.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  if (storageConfig.publicUrl) return `${storageConfig.publicUrl}/${key}`;
  // R2 buckets are private by default and have no MinIO-style public console
  // URL; hand back a short-lived signed URL so callers still get something
  // usable immediately after upload.
  return getSignedDownloadUrl(key);
}

export async function deleteObject(key) {
  await s3Client.send(new DeleteObjectCommand({ Bucket: storageConfig.bucket, Key: key }));
}

export async function getSignedDownloadUrl(key, expiresInSeconds = 3600) {
  const command = new GetObjectCommand({ Bucket: storageConfig.bucket, Key: key });
  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}

/**
 * Signed PUT constrained to a single, server-generated key (imports upload
 * flow, Domain 04 §48) — the client never chooses the destination key.
 */
export async function getSignedUploadUrl({ key, contentType, expiresInSeconds = 900 }) {
  const command = new PutObjectCommand({
    Bucket: storageConfig.bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}

/**
 * Verifies an object actually exists (and returns its real size/content
 * type) — used by complete-upload so the pipeline never trusts the client's
 * claim that an upload succeeded.
 */
export async function headObject(key) {
  try {
    const result = await s3Client.send(new HeadObjectCommand({ Bucket: storageConfig.bucket, Key: key }));
    return { exists: true, sizeBytes: result.ContentLength, contentType: result.ContentType };
  } catch (err) {
    if (err.$metadata?.httpStatusCode === 404 || err.name === 'NotFound') return { exists: false };
    throw err;
  }
}

export async function getObjectBuffer(key) {
  const result = await s3Client.send(new GetObjectCommand({ Bucket: storageConfig.bucket, Key: key }));
  const chunks = [];
  for await (const chunk of result.Body) chunks.push(chunk);
  return Buffer.concat(chunks);
}
