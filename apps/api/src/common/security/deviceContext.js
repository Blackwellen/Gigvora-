import { UAParser } from 'ua-parser-js';
import { sha256Hex, ipHash, ipPrefix, userAgentHash } from './hash.js';
import { db } from '../../db/connection.js';

export function requestIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.socket?.remoteAddress || req.ip || '';
}

export function parseUserAgent(userAgent = '') {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  const deviceType = result.device.type
    ? result.device.type === 'mobile'
      ? 'mobile'
      : result.device.type
    : 'desktop';

  return {
    platform: result.os.name || 'unknown',
    osName: result.os.name || null,
    osVersion: result.os.version || null,
    browserName: result.browser.name || null,
    browserVersion: result.browser.version || null,
    deviceType,
    summary: [result.browser.name, result.browser.version && `${result.browser.version}`, 'on', result.os.name]
      .filter(Boolean)
      .join(' '),
  };
}

export function fingerprintDevice(req) {
  const userAgent = req.headers['user-agent'] || '';
  const acceptLanguage = req.headers['accept-language'] || '';
  return sha256Hex(`${userAgent}|${acceptLanguage}`);
}

export async function upsertDevice({ userId, req }, trx = db) {
  const userAgent = req.headers['user-agent'] || '';
  const parsed = parseUserAgent(userAgent);
  const fingerprint = fingerprintDevice(req);

  const existing = await trx('devices').where({ user_id: userId, device_fingerprint_hash: fingerprint }).first();

  if (existing) {
    const [updated] = await trx('devices')
      .where({ id: existing.id })
      .update({ last_seen_at: trx.fn.now() })
      .returning('*');
    return { device: updated, isNew: false };
  }

  const [device] = await trx('devices')
    .insert({
      user_id: userId,
      device_fingerprint_hash: fingerprint,
      display_name: parsed.summary,
      platform: parsed.platform,
      os_name: parsed.osName,
      os_version: parsed.osVersion,
      browser_name: parsed.browserName,
      browser_version: parsed.browserVersion,
      device_type: parsed.deviceType,
    })
    .returning('*');

  return { device, isNew: true };
}

export function buildRequestContext(req) {
  const ip = requestIp(req);
  const userAgent = req.headers['user-agent'] || '';
  return {
    ip,
    ipHash: ipHash(ip),
    ipPrefix: ipPrefix(ip),
    userAgentHash: userAgentHash(userAgent),
    userAgentSummary: parseUserAgent(userAgent).summary,
  };
}
