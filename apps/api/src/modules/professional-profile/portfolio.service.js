import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { emitEvent } from '../../common/events/outbox.js';
import { getOwnProfileId, recomputeCompleteness } from './shared.js';

function slugify(title) {
  return `${title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')}-${Math.random().toString(36).slice(2, 7)}`;
}

async function withAssets(row) {
  const assets = await db('portfolio_item_assets').where({ portfolio_item_id: row.id }).orderBy('order_index');
  return { ...row, assets };
}

export async function list(userId, { status } = {}) {
  const profileId = await getOwnProfileId(userId);
  let query = db('portfolio_items').where({ profile_id: profileId });
  if (status) query = query.andWhere({ status });
  const rows = await query.orderBy([{ column: 'featured', order: 'desc' }, { column: 'order_index', order: 'asc' }]);
  return Promise.all(rows.map(withAssets));
}

export async function create(userId, input) {
  const profileId = await getOwnProfileId(userId);
  if (!input.title) throw new AppError('Title is required', 422);

  const maxOrder = await db('portfolio_items').where({ profile_id: profileId }).max('order_index as m').first();
  const [row] = await db('portfolio_items')
    .insert({
      profile_id: profileId,
      title: input.title,
      slug: slugify(input.title),
      summary: input.summary || null,
      description_json: JSON.stringify(input.descriptionJson || {}),
      portfolio_type: input.portfolioType || 'case_study',
      linked_project_id: input.linkedProjectId || null,
      linked_gig_id: input.linkedGigId || null,
      role: input.role || null,
      skill_ids: JSON.stringify(input.skillIds || []),
      outcome: input.outcome || null,
      item_date: input.itemDate || null,
      visibility: input.visibility || 'public',
      status: input.status || 'published',
      published_at: (input.status || 'published') === 'published' ? db.fn.now() : null,
      order_index: (maxOrder?.m || 0) + 1,
    })
    .returning('*');

  if (Array.isArray(input.assets)) {
    for (let i = 0; i < input.assets.length; i += 1) {
      const asset = input.assets[i];
      await db('portfolio_item_assets').insert({
        portfolio_item_id: row.id,
        asset_key: asset.assetKey,
        asset_type: asset.assetType || 'image',
        url: asset.url,
        order_index: i,
        caption: asset.caption || null,
        alt_text: asset.altText || null,
      });
    }
  }

  await recomputeCompleteness(profileId);
  await emitEvent({ aggregateType: 'portfolio_item', aggregateId: row.id, eventType: row.status === 'published' ? 'portfolio_item.published' : 'portfolio_item.created', payload: { profileId } });
  return withAssets(row);
}

async function requireOwned(profileId, id) {
  const row = await db('portfolio_items').where({ id, profile_id: profileId }).first();
  if (!row) throw new AppError('Portfolio item not found', 404);
  return row;
}

export async function update(userId, id, input) {
  const profileId = await getOwnProfileId(userId);
  const existing = await requireOwned(profileId, id);

  const patch = {};
  for (const [key, col] of [
    ['title', 'title'],
    ['summary', 'summary'],
    ['portfolioType', 'portfolio_type'],
    ['linkedProjectId', 'linked_project_id'],
    ['linkedGigId', 'linked_gig_id'],
    ['role', 'role'],
    ['outcome', 'outcome'],
    ['itemDate', 'item_date'],
    ['visibility', 'visibility'],
    ['status', 'status'],
    ['featured', 'featured'],
  ]) {
    if (key in input) patch[col] = input[key];
  }
  if ('descriptionJson' in input) patch.description_json = JSON.stringify(input.descriptionJson);
  if ('skillIds' in input) patch.skill_ids = JSON.stringify(input.skillIds);
  if (patch.status === 'published' && existing.status !== 'published') patch.published_at = db.fn.now();

  const [row] = await db('portfolio_items').where({ id }).update(patch).returning('*');
  await emitEvent({ aggregateType: 'portfolio_item', aggregateId: id, eventType: 'portfolio_item.updated', payload: { fields: Object.keys(patch) } });
  return withAssets(row);
}

export async function addAsset(userId, itemId, asset) {
  const profileId = await getOwnProfileId(userId);
  await requireOwned(profileId, itemId);
  const maxOrder = await db('portfolio_item_assets').where({ portfolio_item_id: itemId }).max('order_index as m').first();
  const [row] = await db('portfolio_item_assets')
    .insert({
      portfolio_item_id: itemId,
      asset_key: asset.assetKey,
      asset_type: asset.assetType || 'image',
      url: asset.url,
      order_index: (maxOrder?.m || -1) + 1,
      caption: asset.caption || null,
      alt_text: asset.altText || null,
    })
    .returning('*');
  return row;
}

export async function removeAsset(userId, itemId, assetId) {
  const profileId = await getOwnProfileId(userId);
  await requireOwned(profileId, itemId);
  await db('portfolio_item_assets').where({ id: assetId, portfolio_item_id: itemId }).del();
}

export async function reorder(userId, orderedIds) {
  const profileId = await getOwnProfileId(userId);
  await db.transaction(async (trx) => {
    for (let i = 0; i < orderedIds.length; i += 1) {
      await trx('portfolio_items').where({ id: orderedIds[i], profile_id: profileId }).update({ order_index: i });
    }
  });
  return list(userId);
}

export async function remove(userId, id) {
  const profileId = await getOwnProfileId(userId);
  await requireOwned(profileId, id);
  await db('portfolio_items').where({ id }).del();
  await recomputeCompleteness(profileId);
}
