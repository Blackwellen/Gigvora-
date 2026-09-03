// "professional_services" + "service_packages" — Domain 14 §21-22. Named
// offerings.service.js (not services.service.js) to avoid confusion with
// Gigvora's marketplace `gigs`/`services` domains this composes, not
// replaces.
import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { emitEvent } from '../../common/events/outbox.js';
import { getOwnProfileId, recomputeCompleteness } from './shared.js';

async function withPackages(row) {
  const packages = await db('service_packages').where({ service_id: row.id }).orderBy('order_index');
  return { ...row, packages };
}

export async function list(userId) {
  const profileId = await getOwnProfileId(userId);
  const rows = await db('professional_services').where({ profile_id: profileId }).orderBy('created_at', 'desc');
  return Promise.all(rows.map(withPackages));
}

export async function create(userId, input) {
  const profileId = await getOwnProfileId(userId);
  if (!input.title) throw new AppError('Title is required', 422);

  const [row] = await db('professional_services')
    .insert({
      profile_id: profileId,
      title: input.title,
      description: input.description || null,
      category: input.category || null,
      skill_ids: JSON.stringify(input.skillIds || []),
      status: input.status || 'active',
      rate_type: input.rateType || 'project',
      starting_price_cents: input.startingPriceCents ?? null,
      currency: input.currency || 'USD',
      availability_status: input.availabilityStatus || 'available',
    })
    .returning('*');

  await recomputeCompleteness(profileId);
  await emitEvent({ aggregateType: 'professional_service', aggregateId: row.id, eventType: 'service.created', payload: { profileId } });
  return withPackages(row);
}

async function requireOwned(profileId, id) {
  const row = await db('professional_services').where({ id, profile_id: profileId }).first();
  if (!row) throw new AppError('Service not found', 404);
  return row;
}

export async function update(userId, id, input) {
  const profileId = await getOwnProfileId(userId);
  await requireOwned(profileId, id);

  const patch = {};
  for (const [key, col] of [
    ['title', 'title'],
    ['description', 'description'],
    ['category', 'category'],
    ['status', 'status'],
    ['rateType', 'rate_type'],
    ['startingPriceCents', 'starting_price_cents'],
    ['currency', 'currency'],
    ['availabilityStatus', 'availability_status'],
  ]) {
    if (key in input) patch[col] = input[key];
  }
  if ('skillIds' in input) patch.skill_ids = JSON.stringify(input.skillIds);

  const [row] = await db('professional_services').where({ id }).update(patch).returning('*');
  await emitEvent({ aggregateType: 'professional_service', aggregateId: id, eventType: 'service.updated', payload: { fields: Object.keys(patch) } });
  return withPackages(row);
}

export async function remove(userId, id) {
  const profileId = await getOwnProfileId(userId);
  await requireOwned(profileId, id);
  await db('professional_services').where({ id }).del();
  await recomputeCompleteness(profileId);
}

export async function addPackage(userId, serviceId, input) {
  const profileId = await getOwnProfileId(userId);
  await requireOwned(profileId, serviceId);
  if (!input.name || input.priceCents == null) throw new AppError('Package name and price are required', 422);

  const maxOrder = await db('service_packages').where({ service_id: serviceId }).max('order_index as m').first();
  const [row] = await db('service_packages')
    .insert({
      service_id: serviceId,
      name: input.name,
      description: input.description || null,
      price_cents: input.priceCents,
      currency: input.currency || 'USD',
      delivery_days: input.deliveryDays || null,
      revision_limit: input.revisionLimit ?? null,
      features_json: JSON.stringify(input.features || []),
      order_index: (maxOrder?.m || -1) + 1,
    })
    .returning('*');
  return row;
}

export async function updatePackage(userId, serviceId, packageId, input) {
  const profileId = await getOwnProfileId(userId);
  await requireOwned(profileId, serviceId);
  const owned = await db('service_packages').where({ id: packageId, service_id: serviceId }).first('id');
  if (!owned) throw new AppError('Package not found', 404);

  const patch = {};
  for (const [key, col] of [
    ['name', 'name'],
    ['description', 'description'],
    ['priceCents', 'price_cents'],
    ['currency', 'currency'],
    ['deliveryDays', 'delivery_days'],
    ['revisionLimit', 'revision_limit'],
    ['status', 'status'],
  ]) {
    if (key in input) patch[col] = input[key];
  }
  if ('features' in input) patch.features_json = JSON.stringify(input.features);

  const [row] = await db('service_packages').where({ id: packageId }).update(patch).returning('*');
  return row;
}

export async function removePackage(userId, serviceId, packageId) {
  const profileId = await getOwnProfileId(userId);
  await requireOwned(profileId, serviceId);
  await db('service_packages').where({ id: packageId, service_id: serviceId }).del();
}
