import crypto from "node:crypto";

/**
 * Provider tokens are encrypted at rest with AES-256-GCM. The key is derived
 * from APP_SECRET, so rotating that env var invalidates stored credentials and
 * forces a reconnect rather than leaking them.
 */
const FALLBACK_SECRET = "adsconnect-development-secret-change-me";

function key(): Buffer {
  const secret = process.env.APP_SECRET || FALLBACK_SECRET;
  return crypto.scryptSync(secret, "adsconnect-credentials", 32);
}

export function hasProductionSecret(): boolean {
  return Boolean(process.env.APP_SECRET);
}

export function encryptJson(value: unknown): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const payload = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64url"), tag.toString("base64url"), payload.toString("base64url")].join(".");
}

export function decryptJson<T>(blob: string | undefined | null): T | undefined {
  if (!blob) return undefined;
  const [ivPart, tagPart, payloadPart] = blob.split(".");
  if (!ivPart || !tagPart || !payloadPart) return undefined;
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(ivPart, "base64url"));
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(payloadPart, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    return JSON.parse(plain) as T;
  } catch {
    // Wrong key or tampered payload: treat as "no credentials" and reconnect.
    return undefined;
  }
}

/** Signed, expiring state for OAuth round trips. */
export function signState(payload: Record<string, string>, ttlSeconds = 900): string {
  const body = { ...payload, exp: Date.now() + ttlSeconds * 1000 };
  const encoded = Buffer.from(JSON.stringify(body)).toString("base64url");
  const signature = crypto.createHmac("sha256", key()).update(encoded).digest("base64url");
  return encoded + "." + signature;
}

export function verifyState<T extends Record<string, string>>(state: string | null): T | undefined {
  if (!state) return undefined;
  const [encoded, signature] = state.split(".");
  if (!encoded || !signature) return undefined;
  const expected = crypto.createHmac("sha256", key()).update(encoded).digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return undefined;
  try {
    const body = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as T & { exp: number };
    if (Date.now() > body.exp) return undefined;
    return body;
  } catch {
    return undefined;
  }
}

/** Never log or return a full token; this is what goes in the UI and errors. */
export function maskToken(token: string): string {
  if (token.length <= 8) return "••••";
  return token.slice(0, 4) + "…" + token.slice(-4);
}
