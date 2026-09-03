import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

function slugify(name) {
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

async function uniqueSlug(base) {
  let slug = base || 'workspace';
  let attempt = 0;
  while (await db('companies').where({ slug }).first()) {
    attempt += 1;
    slug = `${base}-${attempt}`;
  }
  return slug;
}

/**
 * Every context the current user can operate in: their personal account plus
 * every company they actively belong to. Ranking blends recency (last_active_at)
 * and starred state, matching the deterministic "recency/frequency" navigation
 * personalisation rule described in the platform-shell spec (no learned model
 * yet — see model_registry `navigation_ranker` seam).
 */
export async function listContexts(userId) {
  const user = await db('users').where({ id: userId }).first('id', 'email', 'first_name', 'last_name', 'headline');
  if (!user) throw new AppError('User not found', 404);
  const profile = await db('profiles').where({ user_id: userId }).first();

  const memberships = await db('company_members')
    .join('companies', 'companies.id', 'company_members.company_id')
    .where('company_members.user_id', userId)
    .andWhere('company_members.status', 'active')
    .select(
      'companies.id',
      'companies.name',
      'companies.slug',
      'companies.logo_url',
      'companies.org_type',
      'companies.plan',
      'company_members.role',
      'company_members.is_starred',
      'company_members.last_active_at',
      'company_members.created_at as joined_at'
    );

  const pendingByCompany = await pendingActionCounts(memberships.map((m) => m.id));
  const unreadByCompany = await unreadMessageCounts(userId, memberships.map((m) => m.id));

  const organizations = memberships
    .map((m) => ({
      id: m.id,
      type: 'organization',
      name: m.name,
      slug: m.slug,
      logoUrl: m.logo_url,
      orgType: m.org_type,
      plan: m.plan,
      role: m.role,
      isStarred: m.is_starred,
      lastActiveAt: m.last_active_at,
      joinedAt: m.joined_at,
      pendingActions: pendingByCompany[m.id] || 0,
      unread: unreadByCompany[m.id] || 0,
    }))
    .sort((a, b) => {
      if (a.isStarred !== b.isStarred) return a.isStarred ? -1 : 1;
      const at = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
      const bt = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
      return bt - at;
    });

  const personal = {
    id: 'personal',
    type: 'personal',
    name: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email,
    email: user.email,
    headline: user.headline,
    hasProfessionalProfile: Boolean(profile),
  };

  return { personal, organizations };
}

async function pendingActionCounts(companyIds) {
  if (!companyIds.length) return {};
  const rows = await db('company_members')
    .whereIn('company_id', companyIds)
    .andWhere('status', 'invited')
    .groupBy('company_id')
    .select('company_id')
    .count('id as count');
  return Object.fromEntries(rows.map((r) => [r.company_id, Number(r.count)]));
}

async function unreadMessageCounts() {
  // Placeholder seam: messaging is not yet workspace-scoped (conversations
  // have no company_id). Returns {} until that link exists rather than
  // fabricating counts.
  return {};
}

export async function switchContext(userId, companyId) {
  if (!companyId || companyId === 'personal') {
    return { type: 'personal', companyId: null };
  }

  const membership = await db('company_members').where({ company_id: companyId, user_id: userId, status: 'active' }).first();
  if (!membership) {
    throw new AppError('You do not have access to this workspace', 403, { code: 'WORKSPACE_FORBIDDEN' });
  }

  await db('company_members').where({ id: membership.id }).update({ last_active_at: db.fn.now() });

  const company = await db('companies').where({ id: companyId }).first('id', 'name', 'slug', 'logo_url', 'org_type', 'plan');
  return { type: 'organization', companyId, role: membership.role, company };
}

export async function starContext(userId, companyId, isStarred) {
  const count = await db('company_members')
    .where({ company_id: companyId, user_id: userId, status: 'active' })
    .update({ is_starred: isStarred });
  if (!count) throw new AppError('You do not have access to this workspace', 403, { code: 'WORKSPACE_FORBIDDEN' });
}

export async function createWorkspace(userId, { name, orgType }) {
  if (!name || !name.trim()) throw new AppError('Workspace name is required', 422);

  const slug = await uniqueSlug(slugify(name));

  return db.transaction(async (trx) => {
    const [company] = await trx('companies')
      .insert({
        owner_id: userId,
        name: name.trim(),
        slug,
        org_type: orgType || 'business',
      })
      .returning('*');

    await trx('company_members').insert({
      company_id: company.id,
      user_id: userId,
      role: 'owner',
      status: 'active',
      last_active_at: trx.fn.now(),
    });

    return company;
  });
}
