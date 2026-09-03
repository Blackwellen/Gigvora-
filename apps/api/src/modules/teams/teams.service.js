import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

const TABLE = 'teams';
const MEMBERS_TABLE = 'team_members';

const WRITABLE_TEAM_FIELDS = [
  'department_id',
  'name',
  'function',
  'description',
  'lead_user_id',
  'capacity_hours_per_week',
  'utilisation_pct',
  'color',
  'status',
];

const WRITABLE_MEMBER_FIELDS = ['role', 'allocation_pct', 'status'];

function pickFields(body = {}, allowed) {
  const out = {};
  for (const field of allowed) {
    if (body[field] !== undefined) out[field] = body[field];
  }
  return out;
}

async function assertTeamInCompany(id, companyId) {
  const team = await db(TABLE).where({ id }).first();
  if (!team || team.company_id !== companyId) throw new AppError('Team not found', 404);
  return team;
}

export async function list(companyId, { department_id, status, q } = {}) {
  const build = () => {
    const query = db(TABLE)
      .where('teams.company_id', companyId)
      .leftJoin('departments', 'departments.id', 'teams.department_id')
      .leftJoin('users', 'users.id', 'teams.lead_user_id');
    if (department_id) query.andWhere('teams.department_id', department_id);
    if (status) query.andWhere('teams.status', status);
    if (q) query.andWhereILike('teams.name', `%${q}%`);
    return query;
  };

  const rows = await build()
    .orderBy('teams.created_at', 'desc')
    .select(
      'teams.*',
      'departments.name as department_name',
      'users.first_name as lead_first_name',
      'users.last_name as lead_last_name'
    );

  const [{ count }] = await build().count({ count: 'teams.id' });

  const teamIds = rows.map((r) => r.id);
  const memberCounts = teamIds.length
    ? await db(MEMBERS_TABLE).whereIn('team_id', teamIds).andWhere('status', 'active').select('team_id').count({ count: '*' }).groupBy('team_id')
    : [];
  const memberCountByTeam = new Map(memberCounts.map((m) => [m.team_id, Number(m.count)]));

  const items = rows.map((row) => ({
    ...row,
    department_name: row.department_name || null,
    lead_name: row.lead_first_name ? `${row.lead_first_name} ${row.lead_last_name}` : null,
    member_count: memberCountByTeam.get(row.id) || 0,
  }));

  return { items, total: Number(count) };
}

export async function getById(companyId, id) {
  const team = await assertTeamInCompany(id, companyId);

  const [department, lead, members] = await Promise.all([
    team.department_id ? db('departments').where({ id: team.department_id }).first('id', 'name') : null,
    team.lead_user_id ? db('users').where({ id: team.lead_user_id }).first('id', 'first_name', 'last_name', 'headline') : null,
    db(MEMBERS_TABLE)
      .where('team_members.team_id', id)
      .join('users', 'users.id', 'team_members.user_id')
      .leftJoin('profiles', 'profiles.user_id', 'users.id')
      .orderBy('team_members.created_at', 'asc')
      .select(
        'team_members.id',
        'team_members.role',
        'team_members.allocation_pct',
        'team_members.status',
        'team_members.joined_at',
        'users.id as user_id',
        'users.first_name',
        'users.last_name',
        'users.headline',
        'profiles.avatar_url'
      ),
  ]);

  return {
    ...team,
    department,
    lead,
    members: members.map((m) => ({
      id: m.id,
      role: m.role,
      allocation_pct: m.allocation_pct,
      status: m.status,
      joined_at: m.joined_at,
      user_id: m.user_id,
      name: `${m.first_name} ${m.last_name}`,
      headline: m.headline,
      avatar_url: m.avatar_url,
    })),
  };
}

export async function create(companyId, data) {
  const fields = pickFields(data, WRITABLE_TEAM_FIELDS);
  if (!fields.name) throw new AppError('A team name is required', 400);

  const payload = { ...fields, company_id: companyId };
  const [record] = await db(TABLE).insert(payload).returning('*');
  return record;
}

export async function update(companyId, id, data) {
  await assertTeamInCompany(id, companyId);
  const fields = pickFields(data, WRITABLE_TEAM_FIELDS);
  const [record] = await db(TABLE).where({ id }).update(fields).returning('*');
  return record;
}

export async function remove(companyId, id) {
  await assertTeamInCompany(id, companyId);
  await db(TABLE).where({ id }).update({ status: 'archived' });
}

export async function addMember(companyId, teamId, data) {
  await assertTeamInCompany(teamId, companyId);
  if (!data?.user_id) throw new AppError('user_id is required', 400);

  const payload = {
    team_id: teamId,
    user_id: data.user_id,
    role: data.role || 'member',
    allocation_pct: data.allocation_pct ?? 100,
    status: data.status || 'active',
    joined_at: db.fn.now(),
  };

  const [record] = await db(MEMBERS_TABLE)
    .insert(payload)
    .onConflict(['team_id', 'user_id'])
    .merge({ role: payload.role, allocation_pct: payload.allocation_pct, status: payload.status })
    .returning('*');
  return record;
}

export async function updateMember(companyId, teamId, memberId, data) {
  await assertTeamInCompany(teamId, companyId);
  const existing = await db(MEMBERS_TABLE).where({ id: memberId, team_id: teamId }).first();
  if (!existing) throw new AppError('Team member not found', 404);

  const fields = pickFields(data, WRITABLE_MEMBER_FIELDS);
  const [record] = await db(MEMBERS_TABLE).where({ id: memberId, team_id: teamId }).update(fields).returning('*');
  return record;
}

export async function removeMember(companyId, teamId, memberId) {
  await assertTeamInCompany(teamId, companyId);
  const count = await db(MEMBERS_TABLE).where({ id: memberId, team_id: teamId }).del();
  if (!count) throw new AppError('Team member not found', 404);
}
