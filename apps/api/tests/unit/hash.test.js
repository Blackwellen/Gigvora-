import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sha256Hex, randomToken, randomRecoveryCode, hashToken, ipHash, ipPrefix } from '../../src/common/security/hash.js';

test('sha256Hex is deterministic and never returns the plaintext', () => {
  const a = sha256Hex('super-secret-token');
  const b = sha256Hex('super-secret-token');
  assert.equal(a, b);
  assert.notEqual(a, 'super-secret-token');
  assert.match(a, /^[0-9a-f]{64}$/);
});

test('randomToken produces unique, sufficiently long opaque tokens', () => {
  const tokens = new Set(Array.from({ length: 200 }, () => randomToken(32)));
  assert.equal(tokens.size, 200, 'expected no collisions across 200 generated tokens');
  for (const t of tokens) assert.ok(t.length >= 40);
});

test('randomRecoveryCode matches the XXXX-XXXX-XXXX high-entropy format', () => {
  for (let i = 0; i < 50; i++) {
    const code = randomRecoveryCode();
    assert.match(code, /^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
  }
});

test('hashToken hashing is consistent with sha256Hex (single hashing scheme for opaque tokens)', () => {
  assert.equal(hashToken('abc'), sha256Hex('abc'));
});

test('ipHash never leaks the raw IP and is stable for the same input', () => {
  const hash1 = ipHash('203.0.113.42');
  const hash2 = ipHash('203.0.113.42');
  assert.equal(hash1, hash2);
  assert.ok(!hash1.includes('203.0.113.42'));
});

test('ipPrefix truncates to a /24 network, not the full address', () => {
  assert.equal(ipPrefix('203.0.113.42'), '203.0.113.0/24');
  assert.notEqual(ipPrefix('203.0.113.42'), '203.0.113.42');
});

test('ipHash/ipPrefix return null for missing input rather than throwing', () => {
  assert.equal(ipHash(null), null);
  assert.equal(ipPrefix(undefined), null);
});
