/**
 * Opaque admin session tokens bound to admin_credentials.session_epoch.
 *
 * Cookie format: `${epoch}.${hmacHex(secret, PURPOSE + ":" + epoch)}`
 * Changing the login password bumps session_epoch → all other browsers
 * lose access; the changing browser gets a freshly minted cookie.
 *
 * Uses Web Crypto so the same helper works in Edge middleware and Node APIs.
 */

export const ADMIN_SESSION_COOKIE = "admin_session";

const PURPOSE = "degself.admin.session.v1";
// Short TTL so a password change invalidates other browsers quickly.
const EPOCH_CACHE_MS = 2_000;

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

let epochCache: { value: number; at: number } | null = null;

/** Drop cached epoch (call after password change on this instance). */
export function clearSessionEpochCache(): void {
  epochCache = null;
}

/**
 * Current session_epoch from admin_credentials.
 * Edge-safe (fetch + service-role). Defaults to 1 if the row is missing.
 * Returns null if Supabase is not configured (fail closed for verify).
 */
export async function getSessionEpoch(): Promise<number | null> {
  const now = Date.now();
  if (epochCache && now - epochCache.at < EPOCH_CACHE_MS) {
    return epochCache.value;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;

  try {
    const res = await fetch(
      `${url}/rest/v1/admin_credentials?id=eq.1&select=session_epoch`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );
    if (!res.ok) {
      console.error("session_epoch fetch failed:", res.status);
      return null;
    }
    const rows = (await res.json()) as { session_epoch?: number }[];
    const value = Number(rows?.[0]?.session_epoch);
    const epoch = Number.isFinite(value) && value >= 1 ? value : 1;
    epochCache = { value: epoch, at: now };
    return epoch;
  } catch (e) {
    console.error("session_epoch fetch error:", e);
    return null;
  }
}

/** Mint cookie value for the given (or current) epoch. */
export async function mintAdminSessionToken(
  epoch?: number
): Promise<string | null> {
  const secret = getAdminSessionSecret();
  if (!secret) return null;
  const e = epoch ?? (await getSessionEpoch());
  if (e == null) return null;
  const sig = await hmacHex(secret, `${PURPOSE}:${e}`);
  return `${e}.${sig}`;
}

function parseToken(token: string): { epoch: number; sig: string } | null {
  const i = token.indexOf(".");
  if (i <= 0) return null;
  const epoch = Number(token.slice(0, i));
  const sig = token.slice(i + 1);
  if (!Number.isInteger(epoch) || epoch < 1 || !sig) return null;
  return { epoch, sig };
}

/** Constant-time verify of a cookie/session value against current epoch. */
export async function verifyAdminSessionToken(
  token: string | undefined | null
): Promise<boolean> {
  if (!token) return false;
  const secret = getAdminSessionSecret();
  if (!secret) return false;

  const parsed = parseToken(token);
  if (!parsed) return false;

  const current = await getSessionEpoch();
  if (current == null || parsed.epoch !== current) return false;

  const expectedSig = await hmacHex(secret, `${PURPOSE}:${parsed.epoch}`);
  return timingSafeEqualStr(parsed.sig, expectedSig);
}
