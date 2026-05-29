# The Vault

A prestigious PWA for sealing questions, worries, and hopes — and delivering them to your future self at a chosen moment.

Gold-on-black, sealed-on-write, postpone-on-open.

## Stack

- **Frontend**: Vite + React + TypeScript, registered as a PWA via `vite-plugin-pwa`
- **Backend**: Vercel serverless functions in `/api`
- **Database**: Turso (libSQL) via `@libsql/client`
- **Notifications**: Notification Triggers API where supported (Chromium); falls back to firing on app open

## Local setup

```bash
npm install
cp .env.example .env
# Fill in TURSO_DATABASE_URL and TURSO_AUTH_TOKEN
npm run db:push      # Creates the `vaults` table
npm run dev          # Vite dev server on http://localhost:5173
```

Notification scheduling and service worker behavior need HTTPS or `localhost`. The dev server uses `localhost`, which counts as a secure context.

### Running the API locally

The `/api/*` routes are Vercel-style handlers. The easiest way to run both the frontend and the API together locally is:

```bash
npm install -g vercel
vercel dev
```

This starts the SPA + serverless routes on a single port (default `http://localhost:3000`).

## Deploy

1. Push the repo to GitHub.
2. Import it into Vercel.
3. Add the env vars in Vercel's project settings:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
4. Run `npm run db:push` locally once against the production Turso DB (or wire a deploy step).

The `vercel.json` rewrites all non-`/api` paths to `index.html` so the SPA router works.

## How it works

- A random user ID is created in `localStorage` on first visit and sent as `x-user-id`. Vaults are scoped to that ID. Simple to swap for real auth later (replace `src/lib/user.ts` + `api/_lib/auth.ts`).
- When you create a vault, the client requests notification permission and — where the Triggers API exists — schedules two notifications: one a configurable number of days before, and one at unlock time.
- On open, the app checks every vault for any that became unlockable since you were last here, and fires "ready" notifications for those.
- When a vault is unlocked, the user is shown a gate ("are you the person it was written for?") — they may open, or hold it indefinitely. Held vaults stay in the list quietly until you choose to open them yourself.

## Notification reality check

The web platform does **not** universally support scheduled notifications. Today:

- **Chromium (Chrome, Edge, Android)**: `TimestampTrigger` works — vaults will notify you even when the app is closed.
- **Safari / Firefox**: scheduled triggers are not supported. The vault still works, but you'll only be reminded the next time you open the app.

For guaranteed cross-device push, add a Vercel cron job + Web Push (VAPID). That is intentionally out of scope for v1.

## File map

```
api/
  _lib/        Turso client, auth, schema migration
  vaults/      CRUD endpoints (`index.ts`, `[id].ts`)
src/
  components/  Reusable visuals (vault mark, emblem)
  lib/         api client, notifications, time, user id
  routes/      VaultList, NewVault, OpenVault
  styles/      Gold-on-black theme
  sw.ts        Service worker (handles notificationclick)
  App.tsx      Routes shell
public/
  icon.svg     PWA / favicon source (also used at any size)
scripts/
  migrate.ts   `npm run db:push`
```

## Sealed at creation

Vaults cannot be edited after `POST /api/vaults`. This is enforced server-side (no PATCH for body/title) and reinforced in the UI. The only mutations after creation are: open, postpone-indefinite, or delete.
