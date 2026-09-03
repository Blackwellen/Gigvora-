import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import pinoHttp from 'pino-http';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import routes from './routes/index.js';
import { notFoundHandler, errorHandler } from './common/middleware/errorHandler.js';
import { stripeWebhookHandler } from './modules/billing/billing.controller.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.webUrl, credentials: true }));
  app.use(compression());

  // Stripe requires the raw request body to verify webhook signatures, so
  // this route is registered with express.raw() BEFORE the global
  // express.json() parser below — it must never see the JSON-parsed body.
  app.post('/api/v1/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookHandler);

  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(pinoHttp());
  app.use(
    rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.use('/api/v1', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
