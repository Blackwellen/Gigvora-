import { redis } from '../../cache/redis.js';

const PRESENCE_TTL_SECONDS = 60;

export function registerPresenceHandlers(io, socket) {
  markOnline(socket.user.sub);

  socket.on('presence:ping', () => markOnline(socket.user.sub));

  socket.on('disconnect', async () => {
    await redis.del(`presence:${socket.user.sub}`);
    io.emit('presence:offline', { userId: socket.user.sub });
  });

  io.emit('presence:online', { userId: socket.user.sub });
}

async function markOnline(userId) {
  await redis.set(`presence:${userId}`, '1', 'EX', PRESENCE_TTL_SECONDS);
}
