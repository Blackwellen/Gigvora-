import crypto from 'node:crypto';

export function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function randomRecoveryCode() {
  const raw = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

export function hashToken(token) {
  return sha256Hex(token);
}

export function ipHash(ip) {
  if (!ip) return null;
  return sha256Hex(String(ip));
}

export function ipPrefix(ip) {
  if (!ip) return null;
  const parts = String(ip).split('.');
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
  return String(ip).split(':').slice(0, 4).join(':') + '::/64';
}

export function userAgentHash(userAgent) {
  if (!userAgent) return null;
  return sha256Hex(userAgent);
}
