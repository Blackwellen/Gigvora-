import http from 'node:http';
import { createApp } from './app.js';
import { createSocketServer } from './websocket/index.js';
import { config } from './config/index.js';

const app = createApp();
const httpServer = http.createServer(app);
createSocketServer(httpServer);

httpServer.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[api] Gigvora API listening on port ${config.port} (${config.env})`);
});

// Trending (Domain 05 Phase 3) needs its trend_scores recomputed
// periodically from real engagement velocity, and scheduled posts need to
// actually flip to 'published' when their scheduled_at arrives. Both used to
// be (or would have been) a bare setInterval in this request-serving
// process; Phase 5 replaced that with proper BullMQ repeatable jobs — see
// jobs/workers/trendRecompute.worker.js and jobs/workers/scheduledPosts.worker.js
// — run in the dedicated worker process (src/workers.js) instead, alongside
// the imports pipeline and AI task workers.
