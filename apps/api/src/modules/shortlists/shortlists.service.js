import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

const TABLE = 'shortlists';
const MEMBERS_TABLE = 'shortlist_members';

const SHORTLIST_WRITABLE_FIELDS = ['job_id', 'name', 'description', 'owner_id', 'status'];
const MEMBER_WRITABLE_FIELDS = ['application_id', 'user_id', 'candidate_name', 'rank', 'notes'];
const MEMBER_UPDATE_FIELDS = ['candidate_name', 'rank', 'notes'];

function pickWritableFields(body = {}, fields) {
  const out = {};
  for (const field of fields) {
    if (body[field] !== undefined) out[field] = body[field];
  }
  return out;
}

async function getShortlistOrThrow(id, companyId) {
  const shortlist = await db(TABLE).where({ id }).first();
  if (!shortlist) throw new AppError('shortlist not found', 404);
  if (companyId && shortlist.company_id !== companyId) throw new AppError('You do not have access to this shortlist', 403);
  return shortlist;
}

async function syncMemberCount(shortlistId) {
  const row = await db(MEMBERS_TABLE).where({ shortlist_id: shortlistId }).count({ count: '*' }).first();
  return Number(row?.count || 0);
}

export async function list(companyId, filters = {}) {
  if (!companyId) throw new AppError('Select a business workspace to continue', 400, { code: 'WORKSPACE_REQUIRED' });
  const { job_id, status } = filters;

  const build = () => {
    const qb = db(TABLE)
      .where('shortlists.company_id', companyId)
      .leftJoin('jobs', 'jobs.id', 'shortlists.job_id');
    if (job_id) qb.andWhere('shortlists.job_id', job_id);
    if (status) qb.andWhere('shortlists.status', status);
    return qb;
  };

  const [rows, [{ count }]] = await Promise.all([
    build().orderBy('shortlists.created_at', 'desc').select('shortlists.*', 'jobs.title as job_title'),
    build().count({ count: 'shortlists.id' }),
  ]);

  const withCounts = await Promise.all(
    rows.map(async (row) => ({ ...row, member_count: await syncMemberCount(row.id) }))
  );

  return { items: withCounts, total: Number(count) };
}

export async function getById(id, companyId) {
  const shortlist = await getShortlistOrThrow(id, companyId);
  const members = await db(MEMBERS_TABLE).where({ shortlist_id: id }).orderBy('rank', 'asc');
  return { ...shortlist, members, member_count: members.length };
}

export async function create(companyId, data) {
  if (!companyId) throw new AppError('Select a business workspace to continue', 400, { code: 'WORKSPACE_REQUIRED' });
  const fields = pickWritableFields(data, SHORTLIST_WRITABLE_FIELDS);
  if (!fields.name) throw new AppError('name is required', 400);

  const [record] = await db(TABLE)
    .insert({ ...fields, company_id: companyId })
    .returning('*');
  return record;
}

export async function update(id, companyId, data) {
  await getShortlistOrThrow(id, companyId);
  const fields = pickWritableFields(data, SHORTLIST_WRITABLE_FIELDS);

  const [record] = await db(TABLE).where({ id }).update(fields).returning('*');
  return record;
}

export async function remove(id, companyId) {
  await getShortlistOrThrow(id, companyId);
  const [record] = await db(TABLE).where({ id }).update({ status: 'archived' }).returning('*');
  return record;
}

export async function addMember(shortlistId, companyId, data) {
  await getShortlistOrThrow(shortlistId, companyId);
  const fields = pickWritableFields(data, MEMBER_WRITABLE_FIELDS);
  if (!fields.candidate_name) throw new AppError('candidate_name is required', 400);

  const [record] = await db(MEMBERS_TABLE)
    .insert({ ...fields, shortlist_id: shortlistId })
    .returning('*');
  return record;
}

export async function updateMember(shortlistId, memberId, companyId, data) {
  await getShortlistOrThrow(shortlistId, companyId);
  const existing = await db(MEMBERS_TABLE).where({ id: memberId, shortlist_id: shortlistId }).first('id');
  if (!existing) throw new AppError('shortlist member not found', 404);

  const fields = pickWritableFields(data, MEMBER_UPDATE_FIELDS);
  const [record] = await db(MEMBERS_TABLE).where({ id: memberId }).update(fields).returning('*');
  return record;
}

export async function removeMember(shortlistId, memberId, companyId) {
  await getShortlistOrThrow(shortlistId, companyId);
  const existing = await db(MEMBERS_TABLE).where({ id: memberId, shortlist_id: shortlistId }).first('id');
  if (!existing) throw new AppError('shortlist member not found', 404);
  await db(MEMBERS_TABLE).where({ id: memberId }).del();
}
