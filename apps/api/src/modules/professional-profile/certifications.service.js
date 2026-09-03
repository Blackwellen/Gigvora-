import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { emitEvent } from '../../common/events/outbox.js';
import { getSignedDownloadUrl } from '../../storage/s3.js';
import { getOwnProfileId, recomputeCompleteness } from './shared.js';

async function withAssetUrl(row) {
  if (!row) return row;
  if (!row.asset_key) return { ...row, assetUrl: null };
  // Credential attachments may be private; always mint a short-lived signed
  // URL rather than exposing the object storage key/URL directly (§93-94).
  const assetUrl = row.visibility === 'public' ? null : await getSignedDownloadUrl(row.asset_key, 900);
  return { ...row, assetUrl };
}

export async function list(userId) {
  const profileId = await getOwnProfileId(userId);
  const rows = await db('certifications').where({ profile_id: profileId }).orderBy('issue_date', 'desc');
  return Promise.all(rows.map(withAssetUrl));
}

export async function create(userId, input) {
  const profileId = await getOwnProfileId(userId);
  if (!input.name || !input.issuerName) throw new AppError('Credential name and issuer are required', 422);

  const [row] = await db('certifications')
    .insert({
      profile_id: profileId,
      issuer_name: input.issuerName,
      name: input.name,
      credential_id: input.credentialId || null,
      credential_url: input.credentialUrl || null,
      issue_date: input.issueDate || null,
      expiry_date: input.expiryDate || null,
      asset_key: input.assetKey || null,
      visibility: input.visibility || 'public',
    })
    .returning('*');

  await recomputeCompleteness(profileId);
  await emitEvent({ aggregateType: 'certification', aggregateId: row.id, eventType: 'certification.created', payload: { profileId } });
  return withAssetUrl(row);
}

export async function update(userId, id, input) {
  const profileId = await getOwnProfileId(userId);
  const owned = await db('certifications').where({ id, profile_id: profileId }).first('id');
  if (!owned) throw new AppError('Certification not found', 404);

  const patch = {};
  for (const [key, col] of [
    ['issuerName', 'issuer_name'],
    ['name', 'name'],
    ['credentialId', 'credential_id'],
    ['credentialUrl', 'credential_url'],
    ['issueDate', 'issue_date'],
    ['expiryDate', 'expiry_date'],
    ['assetKey', 'asset_key'],
    ['visibility', 'visibility'],
  ]) {
    if (key in input) patch[col] = input[key];
  }

  const [row] = await db('certifications').where({ id }).update(patch).returning('*');
  await emitEvent({ aggregateType: 'certification', aggregateId: id, eventType: 'certification.updated', payload: { fields: Object.keys(patch) } });
  return withAssetUrl(row);
}

export async function remove(userId, id) {
  const profileId = await getOwnProfileId(userId);
  const owned = await db('certifications').where({ id, profile_id: profileId }).first('id');
  if (!owned) throw new AppError('Certification not found', 404);
  await db('certifications').where({ id }).del();
  await recomputeCompleteness(profileId);
}
