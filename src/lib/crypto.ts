// All encryption is client-side. The server never sees plaintext or the master key.

const PBKDF2_ITERATIONS = 600_000;
const KEY_LEN_BITS = 256;
const IV_BYTES = 12; // AES-GCM standard
const SALT_BYTES = 16;

/**
 * Helper: copy any byte source into a fresh Uint8Array backed by a plain
 * ArrayBuffer. Required because TS 5.7+ types `TextEncoder.encode()` etc.
 * as `Uint8Array<ArrayBufferLike>`, which Web Crypto's `BufferSource` rejects.
 */
function fresh(view: ArrayBufferView | Uint8Array): Uint8Array<ArrayBuffer> {
  const src =
    view instanceof Uint8Array
      ? view
      : new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  const out = new Uint8Array(new ArrayBuffer(src.length));
  out.set(src);
  return out;
}

function randomBytes(len: number): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(len));
  crypto.getRandomValues(out);
  return out;
}

export function b64encode(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function b64decode(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const bytes = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function randomSaltB64(): string {
  return b64encode(randomBytes(SALT_BYTES));
}

/**
 * Derive an extractable AES-GCM key from the user's password and per-user salt.
 * Extractable so we can cache the raw bytes in sessionStorage between routes.
 */
export async function deriveExtractableKey(password: string, saltB64: string): Promise<CryptoKey> {
  const passwordBytes = fresh(new TextEncoder().encode(password));
  const saltBytes = b64decode(saltB64);
  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordBytes,
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: saltBytes,
      iterations: PBKDF2_ITERATIONS,
    },
    baseKey,
    { name: 'AES-GCM', length: KEY_LEN_BITS },
    true,
    ['encrypt', 'decrypt'],
  );
}

export interface EncryptedPayload {
  ciphertext: string; // base64
  iv: string; // base64
}

export async function encryptJSON(key: CryptoKey, value: unknown): Promise<EncryptedPayload> {
  const iv = randomBytes(IV_BYTES);
  const plaintext = fresh(new TextEncoder().encode(JSON.stringify(value)));
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return {
    ciphertext: b64encode(new Uint8Array(cipherBuf)),
    iv: b64encode(iv),
  };
}

export async function decryptJSON<T = unknown>(
  key: CryptoKey,
  payload: EncryptedPayload,
): Promise<T> {
  const ciphertext = b64decode(payload.ciphertext);
  const iv = b64decode(payload.iv);
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  const text = new TextDecoder().decode(plainBuf);
  return JSON.parse(text) as T;
}

/**
 * Cache the raw key bytes in sessionStorage (per-tab, cleared on tab close).
 * Lets us avoid re-prompting for the password on every route navigation,
 * without keeping the password itself in memory or storage.
 */
export async function exportKeyToSession(key: CryptoKey): Promise<void> {
  const raw = await crypto.subtle.exportKey('raw', key);
  sessionStorage.setItem('vault.mk', b64encode(new Uint8Array(raw)));
}

export async function importKeyFromSession(): Promise<CryptoKey | null> {
  const s = sessionStorage.getItem('vault.mk');
  if (!s) return null;
  const raw = b64decode(s);
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
}

export function clearKeyFromSession(): void {
  sessionStorage.removeItem('vault.mk');
}
