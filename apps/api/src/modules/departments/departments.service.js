import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

const TABLE = 'departments';

const WRITABLE_FIELDS = [
  'parent_department_id',
  'name',
  'cost_center_code',
  'description',
  'head_user_id',
  'budget_annual',
  'currency',
  'headcount_target',
  'status',
];

function pickFields(body = {}, allowed) {
  const out = {};
  for (const field of allowed) {
    if (body[field] !== undefined) out[field] = body[field];
  }
  return out;
}

async function assertDepartmentInCompany(id, companyId) {
  const department = await db(TABLE).where({ id }).first();
  if (!department || department.company_id !== companyId) throw new AppError('Department not found', 404);
  return department;
}

async function memberCounts(departmentIds) {
  if (!departmentIds.length) return new Map();

  const rows = await db('departments')
    .whereIn('departments.id', departmentIds)
    .leftJoin('teams', function join() {
      this.on('teams.department_id', 'departments.id').andOnVal('teams.status', '!=', 'archived');
    })
    .leftJoin('team_members', function join() {
      this.on('team_members.team_id', 'teams.id').andOnVal('team_members.status', 'active');
    })
    .leftJoin('department_members', function join() {
      this.on('department_members.department_id', 'departments.id').andOnVal('department_members.status', 'active');
    })
    .select(
      'departments.id as department_id',
      db.raw('COALESCE(team_members.user_id, department_members.user_id) as user_id')
    );

  const byDepartment = new Map();
  for (const row of rows) {
    if (!row.user_id) continue;
    if (!byDepartment.has(row.department_id)) byDepartment.set(row.department_id, new Set());
    byDepartment.get(row.department_id).add(row.user_id);
  }

  const out = new Map();
  for (const [deptId, set] of byDepartment.entries()) out.set(deptId, set.size);
  return out;
}

async function teamCounts(departmentIds) {
  if (!departmentIds.length) return new Map();
  const rows = await db('teams')
    .whereIn('department_id', departmentIds)
    .andWhere('status', 'active')
    .select('department_id')
    .count({ count: '*' })
    .groupBy('department_id');
  return new Map(rows.map((r) => [r.department_id, Number(r.count)]));
}

async function spentYtd(companyId, departmentIds) {
  if (!departmentIds.length) return new Map();
  const rows = await db('business_spend')
    .where('company_id', companyId)
    .whereIn('department_id', departmentIds)
    .andWhere('spend_date', '>=', db.raw("date_trunc('year', current_date)"))
    .select('department_id')
    .sum({ total: 'amount' })
    .groupBy('department_id');
  return new Map(rows.map((r) => [r.department_id, Number(r.total || 0)]));
}

async function decorate(companyId, rows) {
  const ids = rows.map((r) => r.id);
  const [members, teams, spend] = await Promise.all([memberCounts(ids), teamCounts(ids), spentYtd(companyId, ids)]);

  return rows.map((row) => ({
    ...row,
    team_count: teams.get(row.id) || 0,
    member_count: members.get(row.id) || 0,
    spent_ytd: spend.get(row.id) || 0,
  }));
}

export async function list(companyId, { status } = {}) {
  const build = () => {
    const query = db(TABLE).where('departments.company_id', companyId).leftJoin('users', 'users.id', 'departments.head_user_id');
    if (status) query.andWhere('departments.status', status);
    return query;
  };

  const rows = await build()
    .orderBy('departments.created_at', 'asc')
    .select('departments.*', 'users.first_name as head_first_name', 'users.last_name as head_last_name');
  const [{ count }] = await build().count({ count: 'departments.id' });

  const items = await decorate(
    companyId,
    rows.map((row) => ({
      ...row,
      head_name: row.head_first_name ? `${row.head_first_name} ${row.head_last_name}` : null,
    }))
  );

  return { items, total: Number(count) };
}

export async function getById(companyId, id) {
  const department = await assertDepartmentInCompany(id, companyId);

  const [head, children, teams] = await Promise.all([
    department.head_user_id ? db('users').where({ id: department.head_user_id }).first('id', 'first_name', 'last_name', 'headline') : null,
    db(TABLE).where({ parent_department_id: id }).orderBy('name', 'asc'),
    db('teams').where({ department_id: id }).orderBy('name', 'asc'),
  ]);

  const [decorated] = await decorate(companyId, [department]);

  return { ...decorated, head, children, teams };
}

export async function create(companyId, data) {
  const fields = pickFields(data, WRITABLE_FIELDS);
  if (!fields.name) throw new AppError('A department name is required', 400);

  const payload = { ...fields, company_id: companyId };
  const [record] = await db(TABLE).insert(payload).returning('*');
  return record;
}

export async function update(companyId, id, data) {
  await assertDepartmentInCompany(id, companyId);
  const fields = pickFields(data, WRITABLE_FIELDS);
  const [record] = await db(TABLE).where({ id }).update(fields).returning('*');
  return record;
}

export async function remove(companyId, id) {
  await assertDepartmentInCompany(id, companyId);
  await db(TABLE).where({ id }).update({ status: 'archived' });
}
