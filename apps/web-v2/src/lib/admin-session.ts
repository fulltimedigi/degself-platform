/**
 * Opaque admin session tokens.
 *
 * The cookie must NEVER contain the login password. We mint a deterministic
 * HMAC over a fixed purpose string using ADMIN_SESSION_SECRET (preferred) or,
 * as a deploy-compatible fallback, MODERATION_PASSWORD used only as HMAC key
 * material — never as the cookie value itself.
 *
 * Uses Web Crypto so the same helper works in Edge middleware and Node APIs.
 */

export const ADMIN_SESSION_COOKIE = "admin_session";

const PURPOSE = "degself.admin.session.v1";

/** Secret used to mint/verify the opaque session. Null ⇒ fail closed. */
export function getAdminSessionSecret(): string | null {
  const dedicated = process.env.ADMIN_SESSION_SECRET?.trim();
  if (dedicated) return dedicated;
  const bootstrap = process.env.MODERATION_PASSWORD?.trim();
  return bootstrap || null;
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Mint the opaque session token, or null if no secret is configured. */
export async function mintAdminSessionToken(): Promise<string | null> {
  const secret = getAdminSessionSecret();
  if (!secret) return null;
  return hmacHex(secret, PURPOSE);
}

/** Constant-time verify of a cookie/session value. */
export async function verifyAdminSessionToken(
  token: string | undefined | null
): Promise<boolean> {
  if (!token) return false;
  const expected = await mintAdminSessionToken();
  if (!expected) return false;
  return timingSafeEqualStr(token, expected);
}
