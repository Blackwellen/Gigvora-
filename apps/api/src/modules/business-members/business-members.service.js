import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

const TABLE = 'company_members';

async function assertMemberInCompany(id, companyId) {
  const member = await db(TABLE).where({ id }).first();
  if (!member || member.company_id !== companyId) throw new AppError('Business member not found', 404);
  return member;
}

async function ownerCount(companyId, excludeMemberId) {
  const query = db(TABLE).where({ company_id: companyId, role: 'owner', status: 'active' });
  if (excludeMemberId) query.andWhereNot('id', excludeMemberId);
  const row = await query.count({ count: '*' }).first();
  return Number(row?.count || 0);
}

async function teamAndDepartmentLabels(companyId, userIds) {
  if (!userIds.length) return new Map();

  const [teamRows, deptRows] = await Promise.all([
    db('team_members')
      .join('teams', 'teams.id', 'team_members.team_id')
      .where('teams.company_id', companyId)
      .andWhere('team_members.status', 'active')
      .whereIn('team_members.user_id', userIds)
      .select('team_members.user_id', 'teams.name'),
    db('department_members')
      .join('departments', 'departments.id', 'department_members.department_id')
      .where('departments.company_id', companyId)
      .andWhere('department_members.status', 'active')
      .whereIn('department_members.user_id', userIds)
      .select('department_members.user_id', 'departments.name'),
  ]);

  const byUser = new Map();
  for (const row of teamRows) {
    if (!byUser.has(row.user_id)) byUser.set(row.user_id, { teams: [], departments: [] });
    byUser.get(row.user_id).teams.push(row.name);
  }
  for (const row of deptRows) {
    if (!byUser.has(row.user_id)) byUser.set(row.user_id, { teams: [], departments: [] });
    byUser.get(row.user_id).departments.push(row.name);
  }
  return byUser;
}

export async function list(companyId, { role, status, q } = {}) {
  const build = () => {
    const query = db(TABLE).where('company_members.company_id', companyId).join('users', 'users.id', 'company_members.user_id');
    if (role) query.andWhere('company_members.role', role);
    if (status) query.andWhere('company_members.status', status);
    if (q) {
      query.andWhere((qb) => {
        qb.whereILike('users.first_name', `%${q}%`).orWhereILike('users.last_name', `%${q}%`).orWhereILike('users.email', `%${q}%`);
      });
    }
    return query;
  };

  const rows = await build()
    .orderBy('company_members.created_at', 'asc')
    .select(
      'company_members.id',
      'company_members.company_id',
      'company_members.role',
      'company_members.status',
      'company_members.is_starred',
      'company_members.last_active_at',
      'company_members.created_at',
      'users.id as user_id',
      'users.first_name',
      'users.last_name',
      'users.email',
      'users.headline'
    );
  const [{ count }] = await build().count({ count: 'company_members.id' });

  const labels = await teamAndDepartmentLabels(companyId, rows.map((r) => r.user_id));

  const items = rows.map((row) => ({
    id: row.id,
    company_id: row.company_id,
    role: row.role,
    status: row.status,
    is_starred: row.is_starred,
    last_active_at: row.last_active_at,
    created_at: row.created_at,
    user_id: row.user_id,
    name: `${row.first_name} ${row.last_name}`,
    email: row.email,
    headline: row.headline,
    teams: labels.get(row.user_id)?.teams || [],
    departments: labels.get(row.user_id)?.departments || [],
  }));

  return { items, total: Number(count) };
}

export async function invite(companyId, { email, role } = {}) {
  if (!email) throw new AppError('An email address is required', 400);

  const user = await db('users').whereRaw('lower(email) = ?', [String(email).toLowerCase()]).first();
  if (!user) {
    throw new AppError('No Gigvora user found with that email — they must sign up first', 404, { code: 'USER_NOT_FOUND' });
  }

  const [record] = await db(TABLE)
    .insert({ company_id: companyId, user_id: user.id, role: role || 'member', status: 'invited' })
    .onConflict(['company_id', 'user_id'])
    .merge({ role: role || 'member', status: 'invited' })
    .returning('*');

  return record;
}

export async function update(companyId, id, data) {
  const existing = await assertMemberInCompany(id, companyId);

  const fields = {};
  if (data.role !== undefined) fields.role = data.role;
  if (data.status !== undefined) fields.status = data.status;

  const demotingFromOwner = fields.role !== undefined && fields.role !== 'owner' && existing.role === 'owner';
  const deactivatingOwner = fields.status !== undefined && fields.status !== 'active' && existing.role === 'owner';

  if ((demotingFromOwner || deactivatingOwner) && (await ownerCount(companyId, id)) === 0) {
    throw new AppError('Cannot change the last remaining owner of the workspace', 400, { code: 'LAST_OWNER' });
  }

  const [record] = await db(TABLE).where({ id }).update(fields).returning('*');
  return record;
}

export async function remove(companyId, id) {
  const existing = await assertMemberInCompany(id, companyId);

  if (existing.role === 'owner' && (await ownerCount(companyId, id)) === 0) {
    throw new AppError('Cannot remove the last remaining owner of the workspace', 400, { code: 'LAST_OWNER' });
  }

  await db(TABLE).where({ id }).del();
}
