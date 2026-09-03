// Domain 18 Phase B — Bids / Proposals (18.22/18.23) and Invite (18.24).
// A bid's submitter does NOT need to already be a project member (that's
// the point — marketplace sourcing brings in people who aren't on the
// project yet); everything else in this module requires membership, but bid
// submission only requires the project to be visible/open, and accepting a
// bid is the one place that transactionally turns a bidder into a member.
import { Router } from 'express';
import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { emitEvent } from '../../common/events/outbox.js';
import { getProjectOrThrow, loadProjectContext } from './shared.js';
import { canEditProject, assertPermission } from './permissions.js';

function serializeBid(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    professionalId: row.professional_id,
    coverLetter: row.cover_letter,
    rateType: row.rate_type,
    proposedAmount: Number(row.proposed_amount),
    estimatedDurationDays: row.estimated_duration_days,
    availableFrom: row.available_from,
    status: row.status,
    createdAt: row.created_at,
  };
}

export const router = Router({ mergeParams: true });

router.get('/', asyncHandler(async (req, res) => {
  const { membership } = await loadProjectContext(req.params.id, req.user.sub);
  assertPermission(Boolean(membership), 'You do not have access to this project');

  const query = db('pm_project_bids as b').join('users as u', 'u.id', 'b.professional_id').where('b.project_id', req.params.id);
  if (req.query.status) query.andWhere('b.status', req.query.status);
  const rows = await query.select('b.*', 'u.first_name', 'u.last_name', 'u.headline');
  res.json({ data: rows.map((r) => ({ ...serializeBid(r), professional: { firstName: r.first_name, lastName: r.last_name, headline: r.headline } })) });
}));

router.post('/', asyncHandler(async (req, res) => {
  const project = await getProjectOrThrow(req.params.id);
  if (!['active', 'draft'].includes(project.status)) throw new AppError('This project is not currently accepting proposals', 422);

  const { coverLetter, rateType = 'fixed', proposedAmount, estimatedDurationDays, availableFrom } = req.body;
  if (!coverLetter?.trim() || !Number.isFinite(Number(proposedAmount)) || Number(proposedAmount) <= 0) {
    throw new AppError('coverLetter and a positive proposedAmount are required', 422);
  }

  const existing = await db('pm_project_bids').where({ project_id: req.params.id, professional_id: req.user.sub }).first();
  if (existing) throw new AppError('You have already submitted a proposal for this project', 409);

  const [row] = await db('pm_project_bids')
    .insert({ project_id: req.params.id, professional_id: req.user.sub, cover_letter: coverLetter.trim(), rate_type: rateType, proposed_amount: proposedAmount, estimated_duration_days: estimatedDurationDays ?? null, available_from: availableFrom || null })
    .returning('*');

  await emitEvent({ aggregateType: 'pm_bid', aggregateId: row.id, eventType: 'project.bid_submitted', payload: { projectId: req.params.id, professionalId: req.user.sub } });
  res.status(201).json({ data: serializeBid(row) });
}));

router.patch('/:bidId', asyncHandler(async (req, res) => {
  const { membership } = await loadProjectContext(req.params.id, req.user.sub);
  const bid = await db('pm_project_bids').where({ id: req.params.bidId, project_id: req.params.id }).first();
  if (!bid) throw new AppError('Proposal not found', 404);

  const { status } = req.body;
  if (!['shortlisted', 'interviewing', 'changes_requested', 'accepted', 'declined'].includes(status)) throw new AppError('Invalid status', 422);
  assertPermission(canEditProject(membership), 'You do not have permission to manage proposals');

  if (status === 'accepted') {
    return db.transaction(async (trx) => {
      const [updated] = await trx('pm_project_bids').where({ id: bid.id }).update({ status: 'accepted' }).returning('*');
      await trx('pm_project_bids').where({ project_id: req.params.id }).andWhere('id', '!=', bid.id).andWhereIn('status', ['submitted', 'shortlisted', 'interviewing']).update({ status: 'declined' });

      const alreadyMember = await trx('pm_project_members').where({ project_id: req.params.id, user_id: bid.professional_id }).first();
      if (!alreadyMember) {
        await trx('pm_project_members').insert({ project_id: req.params.id, user_id: bid.professional_id, role: 'professional', invitation_status: 'accepted', joined_at: trx.fn.now() });
        await emitEvent({ aggregateType: 'pm_project', aggregateId: req.params.id, eventType: 'project.member_added', payload: { userId: bid.professional_id, role: 'professional', source: 'bid_accepted' } }, trx);
      }

      await emitEvent({ aggregateType: 'pm_bid', aggregateId: bid.id, eventType: 'project.bid_accepted', payload: { projectId: req.params.id, professionalId: bid.professional_id } }, trx);
      res.json({ data: serializeBid(updated) });
    });
  }

  const [updated] = await db('pm_project_bids').where({ id: bid.id }).update({ status }).returning('*');
  const eventType = status === 'shortlisted' ? 'project.bid_shortlisted' : 'project.bid_updated';
  await emitEvent({ aggregateType: 'pm_bid', aggregateId: bid.id, eventType, payload: { projectId: req.params.id, status } });
  res.json({ data: serializeBid(updated) });
}));

/** 18.24 Invite — a manager directly inviting a known professional, rather than waiting for them to bid. */
router.post('/invite', asyncHandler(async (req, res) => {
  return db.transaction(async (trx) => {
    const { membership } = await loadProjectContext(req.params.id, req.user.sub, trx);
    assertPermission(canEditProject(membership), 'You do not have permission to invite people to this project');

    const { role = 'professional', profileSlug } = req.body;
    let { userId } = req.body;

    // The public Domain 14 talent directory (public-directory.service.js)
    // only ever exposes a profile's slug, never the underlying user id (by
    // design, to avoid leaking internal ids publicly) — so inviting someone
    // found through that directory resolves their slug to a user id here
    // rather than either exposing user ids publicly or duplicating Domain
    // 14's profile table access pattern on the frontend.
    if (!userId && profileSlug) {
      const profile = await trx('profiles').where({ slug: profileSlug }).first('user_id');
      if (!profile) throw new AppError('Professional not found', 404);
      userId = profile.user_id;
    }
    if (!userId) throw new AppError('userId or profileSlug is required', 422);

    const target = await trx('users').where({ id: userId }).first('id');
    if (!target) throw new AppError('User not found', 404);

    const existing = await trx('pm_project_members').where({ project_id: req.params.id, user_id: userId }).first();
    if (existing) throw new AppError('This person is already a member or has a pending invitation', 409);

    const [member] = await trx('pm_project_members')
      .insert({ project_id: req.params.id, user_id: userId, role, invited_by: req.user.sub, invitation_status: 'pending' })
      .returning('*');

    await emitEvent({ aggregateType: 'pm_project', aggregateId: req.params.id, eventType: 'project.invitation_sent', payload: { userId, role } }, trx);
    res.status(201).json({ data: { id: member.id, userId: member.user_id, role: member.role, invitationStatus: member.invitation_status } });
  });
}));

export default router;
