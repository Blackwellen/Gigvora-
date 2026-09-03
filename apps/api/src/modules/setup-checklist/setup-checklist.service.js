import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

export function resolveOwner(req) {
  const workspace = req.workspaceContext;
  if (workspace?.type === 'organization') {
    return { ownerType: 'company', ownerId: workspace.companyId };
  }
  return { ownerType: 'user', ownerId: req.user.sub };
}

const CATALOG = [
  { key: 'complete_profile', title: 'Complete your profile', ctaRoute: '/app/profile-edit', derived: true },
  { key: 'verify_email', title: 'Verify your email', ctaRoute: '/app/account-settings#email', derived: true },
  { key: 'import_contacts', title: 'Import your contacts', ctaRoute: '/app/contacts-import/new', derived: true },
  { key: 'import_company', title: 'Import your company', ctaRoute: '/app/company-import/new', derived: true },
  { key: 'invite_team', title: 'Invite your team', ctaRoute: '/app/workspace-settings/members', derived: true },
  { key: 'set_preferences', title: 'Set your preferences', ctaRoute: '/app/account-settings#preferences', derived: false },
  { key: 'take_product_tour', title: 'Take the product tour', ctaRoute: '/app/product-tour', derived: true },
  { key: 'connect_integrations', title: 'Connect integrations', ctaRoute: '/app/integrations', derived: false },
];

async function isProfileComplete(userId) {
  const profile = await db('profiles').where({ user_id: userId }).first();
  if (!profile) return false;
  const skills = profile.skills || [];
  const experience = profile.experience || [];
  const education = profile.education || [];
  return Boolean(profile.bio) && Boolean(profile.location) && skills.length > 0 && (experience.length > 0 || education.length > 0);
}

async function isEmailVerified(userId) {
  const user = await db('users').where({ id: userId }).first('is_verified');
  return Boolean(user?.is_verified);
}

async function hasCompletedImport(owner, importType) {
  const record = await db('imports')
    .where({ owner_type: owner.ownerType, owner_id: owner.ownerId, import_type: importType, status: 'completed' })
    .first();
  return Boolean(record);
}

async function hasInvitedTeam(owner) {
  if (owner.ownerType !== 'company') return false;
  const count = await db('company_members').where({ company_id: owner.ownerId }).andWhereNot('role', 'owner').count('id as count').first();
  return Number(count.count) > 0;
}

async function tourStatus(userId) {
  const record = await db('product_tour_progress').where({ user_id: userId, tour_key: 'main' }).first();
  return record?.status || 'not_started';
}

/**
 * Assembles the checklist: derivable items are computed live from canonical
 * state (never trust a stale completed_at for these) and overlay any
 * dismissed state stored in setup_checklist_items; non-derivable items read
 * directly from the stored row.
 */
export async function getChecklist(owner, userId) {
  const stored = await db('setup_checklist_items').where({ owner_type: owner.ownerType, owner_id: owner.ownerId });
  const storedByKey = Object.fromEntries(stored.map((s) => [s.item_key, s]));

  const [profileComplete, emailVerified, contactsImported, companyImported, teamInvited, tour] = await Promise.all([
    isProfileComplete(userId),
    isEmailVerified(userId),
    hasCompletedImport(owner, 'contacts'),
    hasCompletedImport(owner, 'company'),
    hasInvitedTeam(owner),
    tourStatus(userId),
  ]);

  const derivedStatus = {
    complete_profile: profileComplete ? 'completed' : 'not_started',
    verify_email: emailVerified ? 'completed' : 'not_started',
    import_contacts: contactsImported ? 'completed' : 'not_started',
    import_company: companyImported ? 'completed' : 'not_started',
    invite_team: teamInvited ? 'completed' : 'not_started',
    take_product_tour: tour === 'completed' ? 'completed' : tour === 'in_progress' ? 'in_progress' : 'not_started',
  };

  return CATALOG.map((item) => {
    const storedRow = storedByKey[item.key];
    let status = item.derived ? derivedStatus[item.key] ?? 'not_started' : storedRow?.status ?? 'not_started';
    if (storedRow?.status === 'dismissed') status = 'dismissed';
    return {
      itemKey: item.key,
      title: item.title,
      ctaRoute: item.ctaRoute,
      status,
      completedAt: storedRow?.completed_at ?? (status === 'completed' ? new Date().toISOString() : null),
      dismissedAt: storedRow?.dismissed_at ?? null,
    };
  });
}

export async function dismissItem(owner, itemKey) {
  if (!CATALOG.some((c) => c.key === itemKey)) {
    throw new AppError(`Unknown checklist item "${itemKey}"`, 422);
  }
  const existing = await db('setup_checklist_items').where({ owner_type: owner.ownerType, owner_id: owner.ownerId, item_key: itemKey }).first();
  if (existing) {
    const [updated] = await db('setup_checklist_items')
      .where({ id: existing.id })
      .update({ status: 'dismissed', dismissed_at: db.fn.now(), updated_at: db.fn.now() })
      .returning('*');
    return updated;
  }
  const [created] = await db('setup_checklist_items')
    .insert({ owner_type: owner.ownerType, owner_id: owner.ownerId, item_key: itemKey, status: 'dismissed', dismissed_at: db.fn.now() })
    .returning('*');
  return created;
}
