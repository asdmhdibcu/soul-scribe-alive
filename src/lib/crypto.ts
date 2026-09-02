/**
 * ALIVE client-side encryption.
 *
 * Web Crypto API only — no third-party crypto dependencies.
 *
 * Threat model: the server stores ciphertext only. The master key is derived
 * on the client at login and held in a module-scoped variable for the lifetime
 * of the tab. It is NEVER written to localStorage, sessionStorage or a cookie.
 */

export const KDF_ITERATIONS = 600_000;
const WRAP_INFO = "alive-wrap-v1";
const RECOVERY_INFO = "alive-recovery-v1";

/* ------------------------------------------------------------------ */
/* encoding helpers                                                    */
/* ------------------------------------------------------------------ */

const enc = new TextEncoder();
const dec = new TextDecoder();

export function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]!);
  return btoa(s);
}

export function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function subtle(): SubtleCrypto {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("Web Crypto is unavailable in this environment.");
  }
  return crypto.subtle;
}

/* ------------------------------------------------------------------ */
/* key derivation                                                      */
/* ------------------------------------------------------------------ */

async function pbkdf2Bits(
  secret: Uint8Array,
  salt: Uint8Array,
  iterations: number,
  bits = 256,
): Promise<Uint8Array> {
  const base = await subtle().importKey("raw", secret as BufferSource, "PBKDF2", false, [
    "deriveBits",
  ]);
  const derived = await subtle().deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    base,
    bits,
  );
  return new Uint8Array(derived);
}

async function hkdfWrappingKey(secret: Uint8Array, info: string): Promise<CryptoKey> {
  const base = await subtle().importKey("raw", secret as BufferSource, "HKDF", false, [
    "deriveKey",
  ]);
  return subtle().deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(32) as BufferSource,
      info: enc.encode(info) as BufferSource,
    },
    base,
    { name: "AES-KW", length: 256 },
    false,
    ["wrapKey", "unwrapKey"],
  );
}

export type DerivedKeys = {
  /** Sent to Supabase Auth in place of the typed password. */
  authPassword: string;
  /** AES-KW key that wraps/unwraps the master key. Never leaves the device. */
  wrappingKey: CryptoKey;
};

/**
 * masterSecret  = PBKDF2(password, salt = email, 600000, SHA-256)
 * authPassword  = base64(PBKDF2(masterSecret, salt = password, 1, SHA-256))
 * wrappingKey   = HKDF(masterSecret, info = "alive-wrap-v1")
 */
export async function deriveKeys(email: string, password: string): Promise<DerivedKeys> {
  const normalizedEmail = email.trim().toLowerCase();
  const masterSecret = await pbkdf2Bits(
    enc.encode(password),
    enc.encode(normalizedEmail),
    KDF_ITERATIONS,
  );
  const authBits = await pbkdf2Bits(masterSecret, enc.encode(password), 1);
  const wrappingKey = await hkdfWrappingKey(masterSecret, WRAP_INFO);
  return { authPassword: toBase64(authBits), wrappingKey };
}

/** Wrapping key derived from a recovery code (uses the account's stored salt). */
export async function deriveRecoveryWrappingKey(
  recoveryCode: string,
  kdfSalt: string,
  iterations: number = KDF_ITERATIONS,
): Promise<CryptoKey> {
  const secret = await pbkdf2Bits(
    enc.encode(recoveryCode.trim().toUpperCase()),
    fromBase64(kdfSalt),
    iterations,
  );
  return hkdfWrappingKey(secret, RECOVERY_INFO);
}

export function generateSalt(): string {
  return toBase64(crypto.getRandomValues(new Uint8Array(16)));
}

/* ------------------------------------------------------------------ */
/* master key                                                          */
/* ------------------------------------------------------------------ */

/** 256 bits of randomness, imported as an AES-GCM key. */
export async function generateMasterKey(): Promise<CryptoKey> {
  const raw = crypto.getRandomValues(new Uint8Array(32));
  return subtle().importKey("raw", raw as BufferSource, { name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

export async function wrapKey(masterKey: CryptoKey, wrappingKey: CryptoKey): Promise<string> {
  const wrapped = await subtle().wrapKey("raw", masterKey, wrappingKey, "AES-KW");
  return toBase64(wrapped);
}

export async function unwrapKey(wrapped: string, wrappingKey: CryptoKey): Promise<CryptoKey> {
  return subtle().unwrapKey(
    "raw",
    fromBase64(wrapped) as BufferSource,
    wrappingKey,
    "AES-KW",
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}

/* ------------------------------------------------------------------ */
/* recovery code                                                       */
/* ------------------------------------------------------------------ */

// Alphabet deliberately excludes 0 O 1 I l
const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** 24 unambiguous characters. */
export function generateRecoveryCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  let out = "";
  for (let i = 0; i < 24; i++) {
    out += RECOVERY_ALPHABET[bytes[i]! % RECOVERY_ALPHABET.length];
  }
  return out;
}

/** Display helper: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX */
export function formatRecoveryCode(code: string): string {
  return (code.match(/.{1,4}/g) ?? []).join("-");
}

export function normalizeRecoveryCode(input: string): string {
  return input.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

/* ------------------------------------------------------------------ */
/* text encryption — base64(nonce):base64(ciphertext)                  */
/* ------------------------------------------------------------------ */

export async function encrypt(plaintext: string, masterKey: CryptoKey): Promise<string> {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const ct = await subtle().encrypt(
    { name: "AES-GCM", iv: nonce as BufferSource },
    masterKey,
    enc.encode(plaintext) as BufferSource,
  );
  return `${toBase64(nonce)}:${toBase64(ct)}`;
}

export async function decrypt(payload: string, masterKey: CryptoKey): Promise<string> {
  const idx = payload.indexOf(":");
  if (idx < 0) throw new Error("Malformed ciphertext payload");
  const nonce = fromBase64(payload.slice(0, idx));
  const ct = fromBase64(payload.slice(idx + 1));
  const pt = await subtle().decrypt(
    { name: "AES-GCM", iv: nonce as BufferSource },
    masterKey,
    ct as BufferSource,
  );
  return dec.decode(pt);
}

/* ------------------------------------------------------------------ */
/* binary encryption — nonce || ciphertext                             */
/* ------------------------------------------------------------------ */

export async function encryptBlob(blob: Blob, masterKey: CryptoKey): Promise<Blob> {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const data = new Uint8Array(await blob.arrayBuffer());
  const ct = await subtle().encrypt(
    { name: "AES-GCM", iv: nonce as BufferSource },
    masterKey,
    data as BufferSource,
  );
  return new Blob([nonce as BlobPart, ct], { type: "application/octet-stream" });
}

export async function decryptBlob(
  data: ArrayBuffer | Blob,
  masterKey: CryptoKey,
): Promise<ArrayBuffer> {
  const buf = data instanceof Blob ? await data.arrayBuffer() : data;
  const all = new Uint8Array(buf);
  const nonce = all.slice(0, 12);
  const ct = all.slice(12);
  return subtle().decrypt(
    { name: "AES-GCM", iv: nonce as BufferSource },
    masterKey,
    ct as BufferSource,
  );
}

/* ------------------------------------------------------------------ */
/* in-memory key holder                                                */
/* ------------------------------------------------------------------ */

let _masterKey: CryptoKey | null = null;
const listeners = new Set<() => void>();

export function setMasterKey(key: CryptoKey | null) {
  _masterKey = key;
  listeners.forEach((fn) => fn());
}

export function clearMasterKey() {
  setMasterKey(null);
}

export function hasMasterKey(): boolean {
  return _masterKey !== null;
}

/** Throws when the vault is locked. Callers should route to the unlock screen. */
export function requireMasterKey(): CryptoKey {
  if (!_masterKey) throw new Error("VAULT_LOCKED");
  return _masterKey;
}

export function onMasterKeyChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* ------------------------------------------------------------------ */
/* convenience wrappers bound to the in-memory key                     */
/* ------------------------------------------------------------------ */

export const encryptField = (plaintext: string) => encrypt(plaintext, requireMasterKey());

/** Sentinel returned when ciphertext cannot be decrypted. Never render as empty. */
export const DECRYPT_FAILED = "\u0000ALIVE_DECRYPT_FAILED";

export function isDecryptFailure(value: string | null | undefined): boolean {
  return value === DECRYPT_FAILED;
}

/** Renders decrypted text, or an explicit failure notice — never silent emptiness. */
export function renderDecrypted(value: string | null | undefined): string {
  if (value == null || value === "") return "";
  return isDecryptFailure(value) ? "This entry could not be decrypted" : value;
}

export async function decryptField(payload: string | null | undefined): Promise<string> {
  if (!payload) return "";
  try {
    return await decrypt(payload, requireMasterKey());
  } catch (err) {
    if (err instanceof Error && err.message === "VAULT_LOCKED") throw err;
    console.error("[crypto] decryption failed", err);
    return DECRYPT_FAILED;
  }
}

export async function encryptJson(value: unknown): Promise<string> {
  return encryptField(JSON.stringify(value));
}

export async function decryptJson<T>(payload: string | null | undefined, fallback: T): Promise<T> {
  const text = await decryptField(payload);
  if (!text || isDecryptFailure(text)) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

