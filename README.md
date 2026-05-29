# The Vault

A prestigious PWA for sealing questions, worries, and hopes — and delivering them to your future self at a chosen moment.

Gold-on-black. Sealed-on-write. Google sign-in. AES-256-GCM at rest.

## Stack

- **Frontend**: Vite + React + TypeScript, registered as a PWA via `vite-plugin-pwa`
- **Backend**: Vercel serverless functions in `/api`
- **Database**: Turso (libSQL) via `@libsql/client`
- **Auth**: Google OAuth 2.0 (Authorization Code flow). Sessions stored in DB, gated by an httpOnly `Secure SameSite=Lax` cookie.
- **Encryption**: AES-256-GCM. Vault `{title, body}` is encrypted server-side with a single `MASTER_KEY` env var before being stored, decrypted on read.
- **Notifications**: Notification Triggers API where supported (Chromium); falls back to firing on app open

## Security & recovery model

This is **server-side encryption-at-rest**, not end-to-end encryption.

- The server can decrypt every vault while handling a request.
- A stolen DB dump alone reveals nothing useful — an attacker also needs `MASTER_KEY`.
- **Recovery story**: you (or anyone with `MASTER_KEY` + DB access) can decrypt all vaults at any time. There's no per-user password to lose.
- **Lose `MASTER_KEY`** → every vault becomes unrecoverable garbage. Back it up somewhere safe (password manager, sealed envelope, whatever you trust).
- Rotating `MASTER_KEY` after data exists makes old vaults unreadable; if you ever want to rotate, write a one-time script that reads with old key + re-encrypts with new key.

## Local setup

```bash
npm install
cp .env.example .env
# Fill in TURSO_*, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, MASTER_KEY.
# Generate MASTER_KEY:
#   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
npm run db:push      # Drops & recreates users/sessions/vaults
vercel dev           # http://localhost:3000
```

## Google OAuth setup (one-time)

1. <https://console.cloud.google.com> → create or pick a project.
2. **APIs & Services → OAuth consent screen** → External → fill in app name, support email, developer contact. Add scopes `openid`, `userinfo.email`, `userinfo.profile`. Add yourself as a test user (you can skip publishing for personal use).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID → Web application**.
4. Authorized redirect URIs (add all you'll use):
   - `https://<your-vercel-domain>/api/auth/google/callback`
   - `http://localhost:3000/api/auth/google/callback` (for local `vercel dev`)
5. Copy the client ID and client secret into `.env` (locally) and into Vercel → Settings → Environment Variables (for production).

## Deploy

1. Push to GitHub.
2. Import to Vercel.
3. Set env vars in Vercel → Settings → Environment Variables:
   - `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - `MASTER_KEY`
   - *(optional)* `APP_BASE_URL` — if your callback host differs from the request host.
4. Run `npm run db:push` locally pointing at the production Turso DB. This is **destructive** — it drops `users` and `vaults` and recreates them. Existing rows are gone.
5. Redeploy (Vercel needs a fresh build after env-var changes).

## API

| Method | Path | Body | Auth | Notes |
|---|---|---|---|---|
| GET | `/api/auth/google/start` | — | — | Redirects to Google consent. Sets short-lived state cookie. |
| GET | `/api/auth/google/callback` | — | — | Google redirects here. Exchanges code, upserts user, sets session cookie, redirects to `/`. |
| GET | `/api/auth/me` | — | cookie | `{ user: User \| null }`. 401 if no session. |
| POST | `/api/auth/logout` | — | cookie | Clears session cookie + DB row. 204. |
| GET | `/api/vaults` | — | cookie | Plaintext list (decrypted server-side). |
| POST | `/api/vaults` | `{ title, body, unlock_at, notify_days_before }` | cookie | Server encrypts before storage. |
| GET | `/api/vaults/:id` | — | cookie | |
| PATCH | `/api/vaults/:id` | `{ action: 'open' \| 'postpone_indefinite' }` | cookie | |
| DELETE | `/api/vaults/:id` | — | cookie | |
| GET | `/api/health` | — | — | Reports presence of all required env vars + DB connectivity. |

## How an unlock event flows

1. Vault `unlock_at` passes.
2. Notification fires (Chromium: via `TimestampTrigger`; else: next app open).
3. Tapping the notification opens `/v/:id`.
4. The route renders a **gate**: "Are you the person this was written for?"
5. Choose:
   - **Open the vault** → server marks `opened_at`, decrypts, returns plaintext, UI reveals with a slow blur-in.
   - **Hold it closed** → server marks `postponed=1`. Vault stays in the list quietly until you choose to open it.

## File map

```
api/
  _lib/         db client, cookies, auth, AES helpers, Google OAuth, schema migration
  auth/
    google/     start.ts, callback.ts (OAuth)
    me.ts, logout.ts
  vaults/       CRUD (encrypted server-side)
  health.ts     diagnostic endpoint
src/
  components/   VaultMark, VaultEmblem
  lib/          api (cookie-credentialed fetch), auth (React context), notifications, time
  routes/       VaultList, NewVault, OpenVault, Login (Google button only)
  styles/       theme.css
  sw.ts         service worker
  App.tsx       routes + RequireAuth guard
public/         icon.svg, vault.svg
scripts/        migrate.ts (npm run db:push)
```
