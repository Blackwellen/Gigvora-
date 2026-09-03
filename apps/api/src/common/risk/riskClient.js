import axios from 'axios';
import { config } from '../../config/index.js';

const client = axios.create({
  baseURL: `${config.mlService.url}/api/v1`,
  timeout: 800,
  headers: config.mlService.apiKey ? { Authorization: `Bearer ${config.mlService.apiKey}` } : {},
});

const FALLBACK = {
  risk_probability: 0,
  risk_score: 0,
  risk_band: 'low',
  model_name: 'deterministic-fallback',
  model_version: 'v0',
  reason_codes: ['ml_service_unavailable'],
  feature_schema_version: 'v1',
  degraded: true,
};

async function post(path, body) {
  try {
    const { data } = await client.post(path, body);
    return { ...data, degraded: false };
  } catch (err) {
    return { ...FALLBACK };
  }
}

export function assessAuthenticationRisk(features) {
  return post('/risk/authentication', features);
}

export function assessSessionRisk(features) {
  return post('/risk/session', features);
}

export function assessRecoveryRisk(features) {
  return post('/risk/recovery', features);
}

export function assessSignupAbuse(features) {
  return post('/abuse/signup', features);
}

export function assessSigninAbuse(features) {
  return post('/abuse/signin', features);
}
