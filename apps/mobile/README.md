# Gigvora Mobile

React Native app (Expo, managed workflow, TypeScript, expo-router). Phase 1: scaffold + core
screens — splash, onboarding, sign-in/sign-up, and a 5-tab shell with a real, live-data-backed
feed, notifications, messages, and profile.

## Getting started

```bash
cp .env.example .env
npm run start --workspace=apps/mobile   # or: npm run dev:mobile from the repo root
```

Then press `a` (Android emulator), `i` (iOS simulator, macOS only), or scan the QR code with the
Expo Go app on a physical device. The API must be running (`npm run dev:api` from the repo root)
and reachable at `EXPO_PUBLIC_API_URL` — on a physical device this can't be `localhost`, use your
machine's LAN IP instead. With no `.env` at all, the app falls back to the live production API at
`https://www.gigvora.com`.

## Structure

```
apps/mobile/
├── app/                        # expo-router file-based routes
│   ├── _layout.tsx             # root: splash hide, onboarding gate, auth gate
│   ├── onboarding.tsx          # first-run swipeable intro (Work. Connect. Grow.)
│   ├── (auth)/
│   │   ├── sign-in.tsx         # POST /auth/login
│   │   └── sign-up.tsx         # POST /auth/register
│   └── (app)/
│       ├── menu.tsx            # modal opened from the far-left tab item
│       └── (tabs)/
│           ├── _layout.tsx     # 5-item bar: menu · alerts · feed(center) · messages · profile
│           ├── live-feed.tsx   # landing screen — GET/POST /feed, reactions, comments
│           ├── notifications.tsx
│           ├── chat/index.tsx  # GET /conversations
│           ├── chat/[id].tsx   # GET/POST /conversations/:id/messages
│           └── profile.tsx
├── src/
│   ├── components/             # Avatar, FeedPostCard
│   └── lib/
│       ├── apiClient.ts        # axios instance, SecureStore tokens, 401 refresh-and-retry
│       ├── SessionContext.tsx  # auth state, backed by GET /users/me
│       ├── onboarding.ts       # AsyncStorage "has seen intro slides" flag
│       ├── useFeed.ts / useInbox.ts / useNotifications.ts   # React Query hooks
│       └── theme.ts            # mirrors apps/web/tailwind.config.ts brand/ink scale
├── app.json                    # Expo config incl. branded splash screen plugin
├── metro.config.js             # monorepo-aware Metro resolver (resolves @gigvora/shared-types)
└── .env.example
```

This app depends on `@gigvora/shared-types` (the same constants shared with `apps/web` and
`apps/api`) via the npm workspace.

Uses Expo's managed workflow — no `ios/`/`android/` native folders are checked in. Run
`npx expo prebuild` only if/when native config is needed.
