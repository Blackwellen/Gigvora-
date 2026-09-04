import 'dotenv/config';

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  appUrl: process.env.APP_URL || 'http://localhost:4000',
  webUrl: process.env.WEB_URL || 'http://localhost:3000',

  giphy: {
    // Falls back to Giphy's own publicly documented beta testing key
    // (https://developers.giphy.com/docs/api/#quick-start-guide — "For
    // testing purposes, use dc6zaTOxFJmzC") so GIF search works out of the
    // box without any setup; set GIPHY_API_KEY to a real registered key
    // before relying on this in production (the beta key is rate-limited
    // and can be revoked/rotated by Giphy at any time).
    apiKey: process.env.GIPHY_API_KEY || 'dc6zaTOxFJmzC',
  },

  db: {
    connectionString: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'gigvora',
    password: process.env.DB_PASSWORD || 'gigvora',
    database: process.env.DB_NAME || 'gigvora',
    pool: {
      min: Number(process.env.DB_POOL_MIN || 2),
      max: Number(process.env.DB_POOL_MAX || 10),
    },
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev_access_secret'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev_refresh_secret'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  storage: {
    // 'r2' (Cloudflare R2, default now that live R2 creds exist) or 's3'
    // (local MinIO for local dev). Same @aws-sdk/client-s3 client either way
    // — only the endpoint/credentials/bucket differ.
    provider: process.env.STORAGE_PROVIDER || 'r2',
    s3: {
      endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
      region: process.env.S3_REGION || 'us-east-1',
      accessKeyId: process.env.S3_ACCESS_KEY_ID || 'gigvora',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || 'gigvora123',
      bucket: process.env.S3_BUCKET || 'gigvora-uploads',
      forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true',
      publicUrl: process.env.S3_PUBLIC_URL || 'http://localhost:9000/gigvora-uploads',
    },
    r2: {
      accountId: process.env.R2_ACCOUNT_ID || '',
      endpoint: process.env.R2_ENDPOINT || '',
      region: 'auto',
      accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      bucket: process.env.R2_BUCKET || 'gigvora-uploads',
      forcePathStyle: true,
      // R2 has no MinIO-style local console URL; if a public bucket/custom
      // domain is configured, expose it via R2_PUBLIC_URL, else fall back to
      // constructing signed URLs on demand (getSignedDownloadUrl below).
      publicUrl: process.env.R2_PUBLIC_URL || '',
    },
  },

  mlService: {
    url: process.env.ML_SERVICE_URL || 'http://localhost:8000',
    apiKey: process.env.ML_SERVICE_API_KEY || '',
  },

  // Self-hosted LiveKit SFU (infra/docker/docker-compose.dev.yml). `url` is
  // the ws:// endpoint the BROWSER connects to for media — the API server
  // itself only needs apiKey/apiSecret to mint join tokens via
  // livekit-server-sdk. `configured` gates every call room feature so the
  // rest of messaging keeps working if LiveKit isn't running.
  livekit: {
    url: process.env.LIVEKIT_URL || '',
    apiKey: process.env.LIVEKIT_API_KEY || '',
    apiSecret: process.env.LIVEKIT_API_SECRET || '',
    get configured() {
      return Boolean(this.url && this.apiKey && this.apiSecret);
    },
  },

  security: {
    encryptionKey: process.env.SECRET_ENCRYPTION_KEY || 'dev_only_32_byte_key_change_me!!',
    webauthnRpId: process.env.WEBAUTHN_RP_ID || 'localhost',
    webauthnRpName: process.env.WEBAUTHN_RP_NAME || 'Gigvora',
    webauthnOrigin: process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000',
    // If set, malwareScanner.js uses a real ClamAV daemon over clamd protocol.
    // Otherwise it honestly falls back to the baseline heuristic scanner.
    clamavHost: process.env.CLAMAV_HOST || '',
    clamavPort: Number(process.env.CLAMAV_PORT || 3310),
  },

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
    max: Number(process.env.RATE_LIMIT_MAX || 100),
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },

  // Azure AI Foundry (EU region). Endpoint/key/api-version come from the real
  // resource in .env; deployment names are our best guess from the .env
  // comment ("GPT-5.4 nano/mini deployments") — if wrong, this is a one-line
  // .env fix, not a code change. `configured` gates every AI call so
  // messaging/inbox keep working with AI fully disabled if unset.
  ai: {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
    apiKey: process.env.AZURE_OPENAI_API_KEY || '',
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-10-21',
    deploymentDefault: process.env.AZURE_OPENAI_DEPLOYMENT_DEFAULT || 'gpt-5.4-mini',
    deploymentFast: process.env.AZURE_OPENAI_DEPLOYMENT_FAST || 'gpt-5.4-nano',
    get configured() {
      return Boolean(this.endpoint && this.apiKey);
    },
  },
};

// Resolved storage config for whichever provider is active — s3.js reads
// this instead of branching on STORAGE_PROVIDER itself.
config.storage.active = config.storage.provider === 's3' ? config.storage.s3 : config.storage.r2;
