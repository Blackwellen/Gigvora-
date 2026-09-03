import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

const TABLE = 'users';

export async function list({ limit = 20, offset = 0 } = {}) {
  return db(TABLE).select('*').orderBy('created_at', 'desc').limit(limit).offset(offset);
}

export async function getById(id) {
  const record = await db(TABLE).where({ id }).first();
  if (!record) throw new AppError('users not found', 404);
  return record;
}

export async function getMe(userId) {
  const user = await db(TABLE)
    .where({ id: userId })
    .first('id', 'email', 'first_name', 'last_name', 'headline', 'account_type', 'role', 'is_verified', 'created_at');
  if (!user) throw new AppError('users not found', 404);

  const profile = await db('profiles')
    .where({ user_id: userId })
    .first('avatar_url', 'cover_url', 'bio', 'location', 'industry', 'open_to_work');

  const [connectionCount, followerCount, followingCount] = await Promise.all([
    db('connections')
      .where('status', 'accepted')
      .andWhere((qb) => qb.where({ requester_id: userId }).orWhere({ addressee_id: userId }))
      .count('id as count')
      .first(),
    db('follows').where({ following_id: userId }).count('id as count').first(),
    db('follows').where({ follower_id: userId }).count('id as count').first(),
  ]);

  return {
    ...user,
    avatarUrl: profile?.avatar_url || null,
    coverUrl: profile?.cover_url || null,
    bio: profile?.bio || null,
    location: profile?.location || null,
    industry: profile?.industry || null,
    openToWork: profile?.open_to_work || false,
    connectionCount: Number(connectionCount?.count || 0),
    followerCount: Number(followerCount?.count || 0),
    followingCount: Number(followingCount?.count || 0),
  };
}

export async function followUser(followerId, followingId) {
  if (followerId === followingId) throw new AppError('You cannot follow yourself', 422);
  const target = await db(TABLE).where({ id: followingId }).first('id');
  if (!target) throw new AppError('users not found', 404);
  const existing = await db('follows').where({ follower_id: followerId, following_id: followingId }).first();
  if (!existing) await db('follows').insert({ follower_id: followerId, following_id: followingId });
  return { following: true };
}

export async function unfollowUser(followerId, followingId) {
  await db('follows').where({ follower_id: followerId, following_id: followingId }).del();
  return { following: false };
}

export async function getFollowStatus(followerId, followingId) {
  const existing = await db('follows').where({ follower_id: followerId, following_id: followingId }).first();
  return { following: Boolean(existing) };
}

export async function create(data) {
  const [record] = await db(TABLE).insert(data).returning('*');
  return record;
}

export async function update(id, data) {
  const [record] = await db(TABLE).where({ id }).update(data).returning('*');
  if (!record) throw new AppError('users not found', 404);
  return record;
}

export async function remove(id) {
  const count = await db(TABLE).where({ id }).del();
  if (!count) throw new AppError('users not found', 404);
}
