import dns from 'node:dns/promises';
import net from 'node:net';
import { AppError } from '../errors/AppError.js';

const MAX_REDIRECTS = 5;
const MAX_RESPONSE_BYTES = 10 * 1024 * 1024; // 10MB
const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Returns true if the given IP address is private/loopback/link-local/
 * cloud-metadata — i.e. must never be reachable from a server-side fetch
 * triggered by user-supplied input (Domain 04 §33).
 */
export function isBlockedIp(ip) {
  const family = net.isIP(ip);
  if (family === 4) {
    const parts = ip.split('.').map(Number);
    const [a, b] = parts;
    if (a === 127) return true; // loopback
    if (a === 10) return true; // RFC1918
    if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
    if (a === 192 && b === 168) return true; // RFC1918
    if (a === 169 && b === 254) return true; // link-local incl. 169.254.169.254 metadata
    if (a === 0) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }
  if (family === 6) {
    const lower = ip.toLowerCase();
    if (lower === '::1') return true; // loopback
    if (lower.startsWith('fe80:')) return true; // link-local
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local
    if (lower.startsWith('::ffff:')) {
      const mapped = lower.split(':').pop();
      if (mapped && net.isIP(mapped) === 4) return isBlockedIp(mapped);
    }
    return false;
  }
  return true; // unknown/unparseable — fail closed
}

async function resolveAndCheck(hostname) {
  const addresses = await dns.lookup(hostname, { all: true });
  if (!addresses.length) throw new AppError('Could not resolve host', 422, { code: 'DNS_RESOLUTION_FAILED' });
  for (const { address } of addresses) {
    if (isBlockedIp(address)) {
      throw new AppError('Target host resolves to a disallowed network range', 422, { code: 'SSRF_BLOCKED' });
    }
  }
  return addresses[0].address;
}

/**
 * SSRF-safe outbound fetch: only http/https, resolves DNS first and rejects
 * private/loopback/link-local/metadata ranges, follows redirects manually
 * (re-validating each hop) up to MAX_REDIRECTS, and caps response size.
 */
export async function safeFetch(url, { method = 'GET', headers = {}, timeoutMs = DEFAULT_TIMEOUT_MS, redirectsLeft = MAX_REDIRECTS } = {}) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new AppError('Invalid URL', 422, { code: 'INVALID_URL' });
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new AppError('Only http(s) URLs are allowed', 422, { code: 'PROTOCOL_NOT_ALLOWED' });
  }

  await resolveAndCheck(parsed.hostname);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetch(parsed.toString(), {
      method,
      headers,
      redirect: 'manual',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if ([301, 302, 303, 307, 308].includes(response.status)) {
    if (redirectsLeft <= 0) {
      throw new AppError('Too many redirects', 422, { code: 'TOO_MANY_REDIRECTS' });
    }
    const location = response.headers.get('location');
    if (!location) throw new AppError('Redirect with no Location header', 502, { code: 'BAD_REDIRECT' });
    const nextUrl = new URL(location, parsed);
    return safeFetch(nextUrl.toString(), { method, headers, timeoutMs, redirectsLeft: redirectsLeft - 1 });
  }

  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength && contentLength > MAX_RESPONSE_BYTES) {
    throw new AppError('Response exceeds maximum allowed size', 502, { code: 'RESPONSE_TOO_LARGE' });
  }

  if (!response.body) {
    return { status: response.status, headers: response.headers, buffer: Buffer.alloc(0) };
  }

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel().catch(() => {});
      throw new AppError('Response exceeds maximum allowed size', 502, { code: 'RESPONSE_TOO_LARGE' });
    }
    chunks.push(value);
  }

  return { status: response.status, headers: response.headers, buffer: Buffer.concat(chunks.map((c) => Buffer.from(c))) };
}
