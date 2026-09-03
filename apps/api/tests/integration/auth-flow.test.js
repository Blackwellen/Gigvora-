import { test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Black-box integration tests against the running dev API (docker compose stack).
 * These exercise the real Postgres/Redis/ML-service pipeline end to end rather than mocking
 * the database, matching how this domain was manually verified during development.
 *
 * Requires: `docker compose -f infra/docker/docker-compose.dev.yml up -d` (api on :4000).
 */
const BASE_URL = process.env.TEST_API_URL || 'http://localhost:4000/api/v1';

function uniqueEmail(prefix) {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
}

async function post(path, body, token) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

test('signup -> unverified login is blocked -> verify -> login succeeds', async () => {
  const email = uniqueEmail('flow');
  const password = 'Str0ngPass!word';

  const register = await post('/auth/register', { email, password, firstName: 'Flow', lastName: 'Test' });
  assert.equal(register.status, 201);
  assert.ok(register.data.verificationToken, 'register should return a verification token in dev');

  const blockedLogin = await post('/auth/login', { email, password });
  assert.equal(blockedLogin.status, 403);
  assert.equal(blockedLogin.data.details.code, 'EMAIL_UNVERIFIED');

  const verify = await post('/auth/email/verify', { token: register.data.verificationToken });
  assert.equal(verify.status, 200);

  const login = await post('/auth/login', { email, password });
  assert.equal(login.status, 200);
  assert.ok(login.data.tokens.accessToken);
  assert.ok(login.data.tokens.refreshToken);
});

test('login with wrong password is rejected without revealing whether the account exists', async () => {
  const existingEmail = uniqueEmail('exists');
  await post('/auth/register', { email: existingEmail, password: 'Str0ngPass!word', firstName: 'A', lastName: 'B' });

  const wrongPasswordOnRealAccount = await post('/auth/login', { email: existingEmail, password: 'WrongPass!123' });
  const nonexistentAccount = await post('/auth/login', { email: uniqueEmail('nope'), password: 'WrongPass!123' });

  assert.equal(wrongPasswordOnRealAccount.status, 401);
  assert.equal(nonexistentAccount.status, 401);
  assert.equal(wrongPasswordOnRealAccount.data.error, nonexistentAccount.data.error, 'error message must not differ by account existence');
});

test('refresh token rotates on use, and reuse of a rotated token is rejected', async () => {
  const email = uniqueEmail('rotate');
  const password = 'Str0ngPass!word';
  const register = await post('/auth/register', { email, password, firstName: 'Rotate', lastName: 'Test' });
  await post('/auth/email/verify', { token: register.data.verificationToken });
  const login = await post('/auth/login', { email, password });

  const firstRefreshToken = login.data.tokens.refreshToken;
  const rotated = await post('/auth/refresh', { refreshToken: firstRefreshToken });
  assert.equal(rotated.status, 200);
  assert.notEqual(rotated.data.tokens.refreshToken, firstRefreshToken);

  const reuseAttempt = await post('/auth/refresh', { refreshToken: firstRefreshToken });
  assert.equal(reuseAttempt.status, 401);
  assert.equal(reuseAttempt.data.details.code, 'REFRESH_REUSED');
});

test('forgot-password returns the same neutral response for existing and nonexistent accounts', async () => {
  const existingEmail = uniqueEmail('reset-exists');
  await post('/auth/register', { email: existingEmail, password: 'Str0ngPass!word', firstName: 'A', lastName: 'B' });

  const forExisting = await post('/auth/password/forgot', { email: existingEmail });
  const forMissing = await post('/auth/password/forgot', { email: uniqueEmail('reset-missing') });

  assert.equal(forExisting.status, 200);
  assert.equal(forMissing.status, 200);
  assert.equal(forExisting.data.sent, true);
  assert.equal(forMissing.data.sent, true);
});

test('reset-password with an expired/invalid token is rejected, not silently accepted', async () => {
  const result = await post('/auth/password/reset', { token: 'not-a-real-token', newPassword: 'Str0ngPass!word2' });
  assert.equal(result.status, 400);
  assert.equal(result.data.details.code, 'TOKEN_INVALID');
});

test('registering the same email twice does not create a duplicate account', async () => {
  const email = uniqueEmail('dupe');
  const first = await post('/auth/register', { email, password: 'Str0ngPass!word', firstName: 'A', lastName: 'B' });
  assert.equal(first.status, 201);

  const second = await post('/auth/register', { email, password: 'Str0ngPass!word', firstName: 'A', lastName: 'B' });
  assert.equal(second.status, 409);
  assert.equal(second.data.details.code, 'ACCOUNT_EXISTS');
});
