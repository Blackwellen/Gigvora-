import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { isValidCountryCode } from '../../common/taxonomies/countries.js';

const COMPANY_TABLE = 'companies';
const ROLES_TABLE = 'business_roles';

const WRITABLE_COMPANY_FIELDS = ['name', 'description', 'logo_url', 'website', 'industry', 'size', 'location', 'country_code'];
const WRITABLE_ROLE_FIELDS = ['name', 'description', 'permissions'];

function pickFields(body = {}, allowed) {
  const out = {};
  for (const field of allowed) {
    if (body[field] !== undefined) out[field] = body[field];
  }
  return out;
}

export async function getWorkspace(companyId) {
  const company = await db(COMPANY_TABLE)
    .where({ id: companyId })
    .first('id', 'name', 'slug', 'description', 'logo_url', 'website', 'industry', 'size', 'location', 'country_code', 'created_at');
  if (!company) throw new AppError('Business workspace not found', 404);

  const [memberCountRow, teamCountRow, departmentCountRow, openJobsCountRow] = await Promise.all([
    db('company_members').where({ company_id: companyId, status: 'active' }).count({ count: '*' }).first(),
    db('teams').where({ company_id: companyId, status: 'active' }).count({ count: '*' }).first(),
    db('departments').where({ company_id: companyId, status: 'active' }).count({ count: '*' }).first(),
    db('jobs').where({ company_id: companyId, status: 'open' }).count({ count: '*' }).first(),
  ]);

  return {
    ...company,
    member_count: Number(memberCountRow?.count || 0),
    team_count: Number(teamCountRow?.count || 0),
    department_count: Number(departmentCountRow?.count || 0),
    open_jobs_count: Number(openJobsCountRow?.count || 0),
  };
}

export async function updateWorkspace(companyId, role, data) {
  if (!['owner', 'admin'].includes(role)) {
    throw new AppError('Only workspace owners and admins can update the business profile', 403, { code: 'FORBIDDEN' });
  }

  const fields = pickFields(data, WRITABLE_COMPANY_FIELDS);
  if (fields.country_code !== undefined && fields.country_code !== null && !isValidCountryCode(fields.country_code)) {
    throw new AppError(`"${fields.country_code}" is not a recognized country code`, 422, { code: 'INVALID_COUNTRY' });
  }
  if (fields.country_code) fields.country_code = fields.country_code.toUpperCase();
  if (Object.keys(fields).length === 0) return getWorkspace(companyId);

  const [record] = await db(COMPANY_TABLE).where({ id: companyId }).update(fields).returning('*');
  if (!record) throw new AppError('Business workspace not found', 404);
  return getWorkspace(companyId);
}

export async function listRoles(companyId) {
  const rows = await db(ROLES_TABLE).where({ company_id: companyId }).orderBy('created_at', 'asc');
  return { items: rows, total: rows.length };
}

export async function createRole(companyId, data) {
  const fields = pickFields(data, WRITABLE_ROLE_FIELDS);
  if (!fields.name) throw new AppError('A role name is required', 400);

  const payload = {
    company_id: companyId,
    name: fields.name,
    description: fields.description ?? null,
    permissions: JSON.stringify(fields.permissions ?? []),
  };

  const [record] = await db(ROLES_TABLE).insert(payload).returning('*');
  return record;
}

export async function updateRole(companyId, id, data) {
  const existing = await db(ROLES_TABLE).where({ id, company_id: companyId }).first();
  if (!existing) throw new AppError('Business role not found', 404);

  const fields = pickFields(data, WRITABLE_ROLE_FIELDS);
  if (fields.permissions !== undefined) fields.permissions = JSON.stringify(fields.permissions);

  const [record] = await db(ROLES_TABLE).where({ id, company_id: companyId }).update(fields).returning('*');
  return record;
}

export async function deleteRole(companyId, id) {
  const existing = await db(ROLES_TABLE).where({ id, company_id: companyId }).first();
  if (!existing) throw new AppError('Business role not found', 404);
  if (existing.is_system) throw new AppError('System roles cannot be deleted', 403, { code: 'SYSTEM_ROLE' });

  await db(ROLES_TABLE).where({ id, company_id: companyId }).del();
}
