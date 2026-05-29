# The Vault

A prestigious PWA for sealing questions, worries, and hopes — and delivering them to your future self at a chosen moment.

Gold-on-black. Sealed-on-write. **End-to-end encrypted: the server never sees your messages.**

## Stack

- **Frontend**: Vite + React + TypeScript, registered as a PWA via `vite-plugin-pwa`
- **Backend**: Vercel serverless functions in `/api`
- **Database**: Turso (libSQL) via `@libsql/client`
- **Auth**: email + password, sessions stored in DB, Bearer token in `Authorization` header. Passwords hashed with Node's built-in `scrypt`.
- **Encryption**: AES-GCM 256, key derived client-side from your password via PBKDF2(600k iters). The server stores only opaque ciphertext.
- **Notifications**: Notification Triggers API where supported (Chromium); falls back to firing on app open

## Security model

- Your **password is the key**. It is sent to the server only over HTTPS, only for `scrypt` verification, and is never stored or logged.
- Your **encryption key never leaves the browser**. It's derived from your password + a per-user salt and cached in `sessionStorage` for the duration of a tab. Closing the tab forgets the key (you'll be prompted at `/unlock` next time).
- The server can see: your email, when each vault was created, when it's scheduled to open, and whether/when you opened it. The server **cannot** see vault titles or bodies.
- **There is no password reset.** If you forget your password, your vaults stay sealed forever. The signup flow makes you acknowledge this.

## Local setup

```bash
npm install
cp .env.example .env
# Fill in TURSO_DATABASE_URL and TURSO_AUTH_TOKEN
npm run db:push      # Creates users, sessions, vaults tables
                     # WARNING: drops any existing `vaults` table to switch to the encrypted schema
vercel dev           # Runs frontend + serverless API together on http://localhost:3000
```

If you used the pre-auth version of this app, `npm run db:push` will drop your old plaintext vaults. There's no migration path because the new schema fundamentally encrypts the content with a per-user key that didn't exist before.

## Deploy

1. Push to GitHub.
2. Import to Vercel.
3. Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in Vercel → Settings → Environment Variables.
4. Run `npm run db:push` locally against the production DB (one-time).
5. Redeploy if you change env vars.

## API

| Method | Path | Body | Auth | Notes |
|---|---|---|---|---|
| POST | `/api/auth/signup` | `{ email, password, enc_salt }` | — | Client generates `enc_salt`. Returns `{ session_token, user }`. |
| POST | `/api/auth/login` | `{ email, password }` | — | Returns `{ session_token, user }` (including `enc_salt`). |
| POST | `/api/auth/logout` | — | Bearer | Invalidates session. |
| GET | `/api/auth/me` | — | Bearer | Returns user record. |
| GET | `/api/vaults` | — | Bearer | Returns all of the user's vaults (ciphertext + metadata). |
| POST | `/api/vaults` | `{ ciphertext, iv, unlock_at, notify_days_before }` | Bearer | Client encrypts `{title, body}` before sending. |
| GET | `/api/vaults/:id` | — | Bearer | |
| PATCH | `/api/vaults/:id` | `{ action: 'open' \| 'postpone_indefinite' }` | Bearer | |
| DELETE | `/api/vaults/:id` | — | Bearer | |
| GET | `/api/health` | — | — | Connectivity + env-var diagnostic. |

## How the encryption works (concretely)

**Sign-up:**
1. Client generates 16 random bytes → `enc_salt`, base64-encoded.
2. Client sends `{ email, password, enc_salt }` to `/api/auth/signup`.
3. Server `scrypt`-hashes the password, stores `users(id, email, pwd_hash, enc_salt)`.
4. Server creates a session, returns `{ session_token, user }`.
5. Client derives `master_key = PBKDF2(password, enc_salt, 600_000, SHA-256, 256 bits)` and stores the raw key bytes (base64) in `sessionStorage`. Password is dropped from memory.

**Creating a vault:**
1. Client generates random 12-byte IV.
2. Client encrypts `JSON.stringify({title, body})` with `AES-GCM(master_key, IV)`.
3. Client POSTs `{ ciphertext_b64, iv_b64, unlock_at, notify_days_before }`.
4. Server stores ciphertext as opaque TEXT.

**Reading a vault:**
1. Client fetches `{ ciphertext, iv, ... }`.
2. Client `AES-GCM(master_key, iv).decrypt(ciphertext)` → `{title, body}`.
3. If the master key is wrong, decryption throws — the UI shows "(unreadable)".

**Login on a new device:**
1. Same `enc_salt` is returned at login.
2. Same password + same salt → same master key → vaults decrypt.

## File map

```
api/
  _lib/         db client, auth helpers, scrypt, schema migration
  auth/         signup, login, logout, me
  vaults/       CRUD (encrypted)
  health.ts     diagnostic endpoint
src/
  components/   VaultMark, VaultEmblem
  lib/          api, auth (React context), crypto, notifications, time
  routes/       VaultList, NewVault, OpenVault, Login, Signup, Unlock
  styles/       theme.css
  sw.ts         service worker (notification click)
  App.tsx       routes + guards
public/         icon.svg, vault.svg
scripts/        migrate.ts (npm run db:push)
```
