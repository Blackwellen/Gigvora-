# Gigvora

Social, professional-networking and recruitment platform.

## Stack

- **Frontend** — Next.js 15 (React 18), TypeScript, Tailwind CSS, Socket.IO client — `apps/web`
- **Mobile** — React Native (Expo), TypeScript — `apps/mobile`
- **Backend API** — Modular Node.js (Express), Socket.IO (WebSockets), BullMQ (job queues) — `apps/api`
- **ML API** — Python FastAPI, scikit-learn/pandas — `apps/ml-service`
- **Database** — PostgreSQL, migrated & seeded via Knex (`apps/api/src/db`)
- **Cache / pub-sub** — Redis (sessions, presence, BullMQ, Socket.IO adapter)
- **Object storage** — S3-compatible (MinIO locally, swap for AWS S3 in prod)

## Structure

```
gigvora/
├── apps/
│   ├── web/          # Next.js frontend
│   ├── mobile/        # React Native (Expo) app
│   ├── api/           # Node.js modular backend + WebSocket server
│   │   └── src/
│   │       ├── modules/       # auth, users, profiles, connections, posts, jobs, applications, messaging, notifications, search
│   │       ├── db/            # knexfile, migrations, seeds
│   │       ├── websocket/     # Socket.IO server + handlers
│   │       ├── jobs/          # BullMQ queues + workers
│   │       ├── cache/         # Redis client
│   │       ├── storage/       # S3/MinIO client
│   │       └── common/        # middleware, errors, utils
│   └── ml-service/    # FastAPI ML service (matching, recommendations)
├── packages/
│   └── shared-types/  # constants/types shared across apps
└── infra/
    └── docker/         # docker-compose.yml (postgres, redis, minio, api, worker, ml-service, web)
```

## Getting started

1. Copy env files:
   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/ml-service/.env.example apps/ml-service/.env
   cp apps/web/.env.example apps/web/.env.local
   cp apps/mobile/.env.example apps/mobile/.env
   ```
2. Start infra + services with Docker:
   ```bash
   npm run docker:up
   ```
3. Run migrations & seeders:
   ```bash
   cd apps/api && npm install && npm run migrate && npm run seed
   ```
4. Or run everything locally without Docker:
   ```bash
   npm install
   npm run dev          # runs api + web concurrently
   cd apps/ml-service && pip install -r requirements.txt && uvicorn app.main:app --reload
   ```
5. Run the mobile app (needs the API running — see `apps/mobile/README.md`):
   ```bash
   npm run dev:mobile
   ```

Seeded accounts (password `Password123!`): `admin@gigvora.com`, `jamahl@gigvora.com`, `recruiter@gigvora.com`.
