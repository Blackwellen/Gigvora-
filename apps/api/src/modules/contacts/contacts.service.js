import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { normalizeEmail, normalizePhone } from '../../common/utils/normalize.js';

const TABLE = 'contacts';

export function resolveOwner(req) {
  const workspace = req.workspaceContext;
  if (workspace?.type === 'organization') {
    return { ownerType: 'company', ownerId: workspace.companyId };
  }
  return { ownerType: 'user', ownerId: req.user.sub };
}

export async function list(owner, { limit = 20, offset = 0, search } = {}) {
  let query = db(TABLE).where({ owner_type: owner.ownerType, owner_id: owner.ownerId });
  if (search) {
    query = query.andWhere((qb) => {
      qb.whereILike('first_name', `%${search}%`)
        .orWhereILike('last_name', `%${search}%`)
        .orWhereILike('email_normalized', `%${search.toLowerCase()}%`)
        .orWhereILike('company_name', `%${search}%`);
    });
  }
  return query.orderBy('created_at', 'desc').limit(limit).offset(offset);
}

export async function getById(owner, id) {
  const record = await db(TABLE).where({ id, owner_type: owner.ownerType, owner_id: owner.ownerId }).first();
  if (!record) throw new AppError('Contact not found', 404);
  return record;
}

export async function create(owner, data) {
  const [record] = await db(TABLE)
    .insert({
      owner_type: owner.ownerType,
      owner_id: owner.ownerId,
      workspace_id: owner.ownerType === 'company' ? owner.ownerId : null,
      first_name: data.firstName ?? null,
      last_name: data.lastName ?? null,
      email_normalized: normalizeEmail(data.email),
      phone_normalized: normalizePhone(data.phone),
      company_name: data.companyName ?? null,
      title: data.title ?? null,
      location: data.location ?? null,
      tags: JSON.stringify(data.tags ?? []),
      source: 'manual',
    })
    .returning('*');
  return record;
}

export async function update(owner, id, data) {
  const patch = {};
  if ('firstName' in data) patch.first_name = data.firstName;
  if ('lastName' in data) patch.last_name = data.lastName;
  if ('email' in data) patch.email_normalized = normalizeEmail(data.email);
  if ('phone' in data) patch.phone_normalized = normalizePhone(data.phone);
  if ('companyName' in data) patch.company_name = data.companyName;
  if ('title' in data) patch.title = data.title;
  if ('location' in data) patch.location = data.location;
  if ('tags' in data) patch.tags = JSON.stringify(data.tags);
  patch.updated_at = db.fn.now();

  const [record] = await db(TABLE)
    .where({ id, owner_type: owner.ownerType, owner_id: owner.ownerId })
    .update(patch)
    .returning('*');
  if (!record) throw new AppError('Contact not found', 404);
  return record;
}

export async function remove(owner, id) {
  const count = await db(TABLE).where({ id, owner_type: owner.ownerType, owner_id: owner.ownerId }).del();
  if (!count) throw new AppError('Contact not found', 404);
}

/**
 * Normalized exact-match duplicate search — used both by the "existing
 * contacts" UI helper and by importDedupe.worker.js's rule-based fallback.
 */
export async function searchDuplicates(owner, { email, phone, firstName, lastName }) {
  const emailNorm = normalizeEmail(email);
  const phoneNorm = normalizePhone(phone);

  if (!emailNorm && !phoneNorm && !(firstName && lastName)) return [];

  let query = db(TABLE).where({ owner_type: owner.ownerType, owner_id: owner.ownerId });
  query = query.andWhere((qb) => {
    let any = false;
    if (emailNorm) {
      qb.orWhere('email_normalized', emailNorm);
      any = true;
    }
    if (phoneNorm) {
      qb.orWhere('phone_normalized', phoneNorm);
      any = true;
    }
    if (!any && firstName && lastName) {
      qb.orWhere((inner) => inner.whereRaw('lower(first_name) = ?', [firstName.toLowerCase()]).andWhereRaw('lower(last_name) = ?', [lastName.toLowerCase()]));
    }
  });

  return query.limit(20);
}
