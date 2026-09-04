import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { resolveRecruiterCompanyId } from '../../common/utils/resolveRecruiterCompany.js';

async function assertOwnedTemplate(companyId, id) {
  const template = await db('outreach_templates').where({ id, company_id: companyId }).first();
  if (!template) throw new AppError('Template not found', 404);
  return template;
}

export async function list(userId, { channel, category } = {}) {
  const companyId = await resolveRecruiterCompanyId(userId);
  const qb = db('outreach_templates').where({ company_id: companyId });
  if (channel) qb.andWhere({ channel });
  if (category) qb.andWhere({ category });
  return qb.orderBy('usage_count', 'desc');
}

export async function getById(userId, id) {
  const companyId = await resolveRecruiterCompanyId(userId);
  return assertOwnedTemplate(companyId, id);
}

export async function create(userId, { name, channel, subject, body, category } = {}) {
  const companyId = await resolveRecruiterCompanyId(userId);
  if (!name?.trim()) throw new AppError('name is required', 422);
  if (!body?.trim()) throw new AppError('body is required', 422);
  const [row] = await db('outreach_templates')
    .insert({
      company_id: companyId,
      name: name.trim(),
      channel: channel || 'email',
      subject: subject || null,
      body: body.trim(),
      category: category || null,
      created_by_user_id: userId,
    })
    .returning('*');
  return row;
}

export async function update(userId, id, { name, channel, subject, body, category } = {}) {
  const companyId = await resolveRecruiterCompanyId(userId);
  await assertOwnedTemplate(companyId, id);
  const patch = {};
  if (name !== undefined) patch.name = name;
  if (channel !== undefined) patch.channel = channel;
  if (subject !== undefined) patch.subject = subject;
  if (body !== undefined) patch.body = body;
  if (category !== undefined) patch.category = category;
  if (!Object.keys(patch).length) throw new AppError('Nothing to update', 422);
  const [row] = await db('outreach_templates').where({ id }).update(patch).returning('*');
  return row;
}

export async function remove(userId, id) {
  const companyId = await resolveRecruiterCompanyId(userId);
  await assertOwnedTemplate(companyId, id);
  await db('outreach_templates').where({ id }).del();
}

export async function use(userId, id) {
  const companyId = await resolveRecruiterCompanyId(userId);
  await assertOwnedTemplate(companyId, id);
  return incrementUsage(id);
}

// Called directly (no auth context) from bulkOutreach.service and
// sequences.service whenever a template is actually put to use.
export async function incrementUsage(id) {
  const [row] = await db('outreach_templates').where({ id }).increment('usage_count', 1).returning('*');
  if (!row) throw new AppError('Template not found', 404);
  return row;
}
