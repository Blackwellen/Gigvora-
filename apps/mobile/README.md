# Gigvora Mobile

React Native app (Expo, managed workflow, TypeScript). Not yet wired up with feature modules —
this is the base project setup only.

## Getting started

```bash
cp .env.example .env
npm run start --workspace=apps/mobile   # or: npm run dev:mobile from the repo root
```

Then press `a` (Android emulator), `i` (iOS simulator, macOS only), or scan the QR code with the
Expo Go app on a physical device. The API must be running (`npm run dev:api` from the repo root)
and reachable at `EXPO_PUBLIC_API_URL` — on a physical device this can't be `localhost`, use your
machine's LAN IP instead.

## Structure

```
apps/mobile/
├── App.tsx           # entry component
├── src/
│   └── lib/
│       └── apiClient.ts   # thin fetch wrapper around EXPO_PUBLIC_API_URL
├── app.json          # Expo config
├── metro.config.js    # monorepo-aware Metro resolver (resolves @gigvora/shared-types)
└── .env.example
```

This app depends on `@gigvora/shared-types` (the same constants shared with `apps/web` and
`apps/api`) via the npm workspace.

Uses Expo's managed workflow — no `ios/`/`android/` native folders are checked in. Run
`npx expo prebuild` only if/when native config is needed.
