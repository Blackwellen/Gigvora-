import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { createRedisClient } from '../cache/redis.js';
import { registerMessagingHandlers } from './handlers/messaging.js';
import { registerNotificationHandlers, registerNotificationsRealtimeBridge } from './handlers/notifications.js';
import { registerPresenceHandlers } from './handlers/presence.js';
import { registerSecurityRealtimeBridge } from './handlers/security.js';
import { registerMessagingRealtimeBridge } from './handlers/messagingBridge.js';
import { registerImportsRealtimeBridge, registerImportsHandlers } from './handlers/imports.js';
import { registerCallHandlers } from './handlers/calls.js';
import { registerFeedRealtimeBridge, registerFeedHandlers } from './handlers/feed.js';
import { registerAiRealtimeBridge } from './handlers/aiBridge.js';
import { registerProjectRealtimeBridge, registerProjectHandlers } from './handlers/projectHandlers.js';
import { registerJobsRealtimeBridge, registerJobsHandlers } from './handlers/jobs.js';

export function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: config.webUrl, credentials: true },
    path: '/ws',
  });

  const pubClient = createRedisClient();
  const subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) return next(new Error('Unauthorized'));
      const payload = jwt.verify(token, config.jwt.accessSecret);
      socket.user = payload;
      return next();
    } catch (err) {
      return next(new Error('Unauthorized'));
    }
  });

  registerSecurityRealtimeBridge(io);
  registerMessagingRealtimeBridge(io);
  registerImportsRealtimeBridge(io);
  registerFeedRealtimeBridge(io);
  registerAiRealtimeBridge(io);
  registerProjectRealtimeBridge(io);
  registerJobsRealtimeBridge(io);
  registerNotificationsRealtimeBridge(io);

  io.on('connection', (socket) => {
    socket.join(`user:${socket.user.sub}`);

    registerPresenceHandlers(io, socket);
    registerMessagingHandlers(io, socket);
    registerNotificationHandlers(io, socket);
    registerImportsHandlers(io, socket);
    registerCallHandlers(io, socket);
    registerFeedHandlers(io, socket);
    registerProjectHandlers(io, socket);
    registerJobsHandlers(io, socket);

    socket.on('disconnect', () => {
      socket.leave(`user:${socket.user.sub}`);
    });
  });

  return io;
}
