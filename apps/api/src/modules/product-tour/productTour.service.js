import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { getTourConfig } from './productTour.config.js';

async function logEvent(userId, tourKey, stepKey, eventType, metadata = {}) {
  await db('tour_step_events').insert({ user_id: userId, tour_key: tourKey, step_key: stepKey, event_type: eventType, metadata: JSON.stringify(metadata) });
}

export async function getTour(userId, tourKey) {
  const config = getTourConfig(tourKey);
  if (!config) throw new AppError(`Unknown tour "${tourKey}"`, 404);
  const progress = await db('product_tour_progress').where({ user_id: userId, tour_key: tourKey }).first();
  return { tourKey, config, progress: progress || { status: 'not_started', current_step_index: 0 } };
}

async function upsertProgress(userId, tourKey, patch) {
  const existing = await db('product_tour_progress').where({ user_id: userId, tour_key: tourKey }).first();
  if (existing) {
    const [updated] = await db('product_tour_progress').where({ id: existing.id }).update({ ...patch, updated_at: db.fn.now() }).returning('*');
    return updated;
  }
  const [created] = await db('product_tour_progress').insert({ user_id: userId, tour_key: tourKey, ...patch }).returning('*');
  return created;
}

export async function startTour(userId, tourKey) {
  const config = getTourConfig(tourKey);
  if (!config) throw new AppError(`Unknown tour "${tourKey}"`, 404);
  const progress = await upsertProgress(userId, tourKey, { status: 'in_progress', current_step_index: 0, started_at: db.fn.now() });
  await logEvent(userId, tourKey, config.steps[0]?.key || null, 'start');
  return progress;
}

export async function recordStep(userId, tourKey, stepIndex) {
  const config = getTourConfig(tourKey);
  if (!config) throw new AppError(`Unknown tour "${tourKey}"`, 404);
  if (stepIndex < 0 || stepIndex >= config.steps.length) throw new AppError('Invalid step index', 422);

  const progress = await upsertProgress(userId, tourKey, { status: 'in_progress', current_step_index: stepIndex });
  await logEvent(userId, tourKey, config.steps[stepIndex].key, 'step_view');
  return progress;
}

export async function completeTour(userId, tourKey) {
  const config = getTourConfig(tourKey);
  if (!config) throw new AppError(`Unknown tour "${tourKey}"`, 404);
  const progress = await upsertProgress(userId, tourKey, {
    status: 'completed',
    current_step_index: config.steps.length - 1,
    completed_at: db.fn.now(),
  });
  await logEvent(userId, tourKey, config.steps[config.steps.length - 1]?.key || null, 'complete');
  return progress;
}

export async function dismissTour(userId, tourKey) {
  const config = getTourConfig(tourKey);
  if (!config) throw new AppError(`Unknown tour "${tourKey}"`, 404);
  const progress = await upsertProgress(userId, tourKey, { status: 'dismissed', dismissed_at: db.fn.now() });
  await logEvent(userId, tourKey, null, 'dismiss');
  return progress;
}
