import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { db } from '../../db/connection.js';
import { notify } from '../notifications/notify.js';
import * as service from './connections.service.js';

export const listHandler = asyncHandler(async (req, res) => {
  const { limit, offset } = req.query;
  const records = await service.list({ limit: Number(limit) || undefined, offset: Number(offset) || undefined });
  res.json({ data: records });
});

export const pendingRequestsHandler = asyncHandler(async (req, res) => {
  const result = await service.listPendingForUser(req.user.sub, { limit: Number(req.query.limit) || undefined });
  res.json({ data: result.items, meta: { total: result.total } });
});

export const getHandler = asyncHandler(async (req, res) => {
  const record = await service.getById(req.params.id);
  res.json({ data: record });
});

export const createHandler = asyncHandler(async (req, res) => {
  // requester_id always comes from the authenticated session, never the
  // request body — a client-supplied requester_id would let anyone send a
  // connection request "as" someone else.
  const record = await service.create({ requester_id: req.user.sub, addressee_id: req.body.addressee_id, status: 'pending' });
  const actor = await db('users').where({ id: req.user.sub }).first('first_name', 'last_name');
  await notify({
    userId: req.body.addressee_id,
    actorId: req.user.sub,
    type: 'connection.request',
    payload: { actorName: actor ? `${actor.first_name} ${actor.last_name}` : 'Someone', connectionId: record.id, deepLink: '/app/network?tab=invitations' },
  });
  res.status(201).json({ data: record });
});

export const updateHandler = asyncHandler(async (req, res) => {
  const record = await service.update(req.params.id, req.body);
  res.json({ data: record });
});

export const removeHandler = asyncHandler(async (req, res) => {
  await service.remove(req.params.id);
  res.status(204).send();
});
