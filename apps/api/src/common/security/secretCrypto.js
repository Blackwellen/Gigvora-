import crypto from 'node:crypto';
import { config } from '../../config/index.js';

/**
 * Encrypts secrets-at-rest (TOTP seeds, etc.) with AES-256-GCM using a server-held key.
 * This is the "secret_ref" pattern from the spec — the DB never holds a plaintext seed.
 * In production this key should come from a managed secret store (KMS/Vault), not an env var.
 */
function deriveKey() {
  return crypto.createHash('sha256').update(config.security.encryptionKey).digest();
}

export function encryptSecret(plaintext) {
  const key = deriveKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptSecret(ref) {
  const key = deriveKey();
  const raw = Buffer.from(ref, 'base64');
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
