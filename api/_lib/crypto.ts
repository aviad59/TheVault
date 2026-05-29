import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

const IV_LEN = 12; // AES-GCM standard
const TAG_LEN = 16;

let cachedKey: Buffer | null = null;

function masterKey(): Buffer {
  if (cachedKey) return cachedKey;
  const b64 = process.env.MASTER_KEY;
  if (!b64) {
    throw new Error('MASTER_KEY env var is not set (32 bytes, base64)');
  }
  const key = Buffer.from(b64, 'base64');
  if (key.length !== 32) {
    throw new Error(
      `MASTER_KEY must decode to 32 bytes (256 bits) of base64; got ${key.length} bytes`,
    );
  }
  cachedKey = key;
  return key;
}

export interface Sealed {
  ciphertext: string; // base64 of (ciphertext || tag)
  iv: string; // base64
}

export function sealString(plaintext: string): Sealed {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv('aes-256-gcm', masterKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: Buffer.concat([enc, tag]).toString('base64'),
    iv: iv.toString('base64'),
  };
}

export function unsealString(sealed: Sealed): string {
  const iv = Buffer.from(sealed.iv, 'base64');
  if (iv.length !== IV_LEN) throw new Error('invalid iv length');
  const blob = Buffer.from(sealed.ciphertext, 'base64');
  if (blob.length < TAG_LEN) throw new Error('ciphertext too short');
  const tag = blob.subarray(blob.length - TAG_LEN);
  const enc = blob.subarray(0, blob.length - TAG_LEN);
  const decipher = createDecipheriv('aes-256-gcm', masterKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

export function sealJSON(value: unknown): Sealed {
  return sealString(JSON.stringify(value));
}

export function unsealJSON<T = unknown>(sealed: Sealed): T {
  return JSON.parse(unsealString(sealed)) as T;
}
