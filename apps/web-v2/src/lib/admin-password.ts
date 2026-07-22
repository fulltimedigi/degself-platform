// Server-only admin password store. The login password lives in the DB
// (public.admin_credentials) as a scrypt hash; MODERATION_PASSWORD is only the
// bootstrap value used until the first hash is written. NEVER import from a
// client component — this uses node:crypto and the service-role Supabase client.
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const KEYLEN = 64;

/** Hash a password as "<saltHex>:<keyHex>" (scrypt). */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, KEYLEN);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

/** Constant-time verify of a password against a stored "<saltHex>:<keyHex>". */
export function verifyPasswordHash(password: string, stored: string): boolean {
  const [saltHex, keyHex] = stored.split(":");
  if (!saltHex || !keyHex) return false;
  let expected: Buffer;
  try {
    expected = Buffer.from(keyHex, "hex");
  } catch {
    return false;
  }
  if (expected.length !== KEYLEN) return false;
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), KEYLEN);
  return timingSafeEqual(actual, expected);
}

/** The current stored hash, or null if none set yet (pre-bootstrap). */
export async function getStoredHash(): Promise<string | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("admin_credentials")
    .select("password_hash")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.password_hash as string | undefined) ?? null;
}

/**
 * Verify a submitted admin password. Uses the DB hash once one exists; before
 * that (fresh install), falls back to the MODERATION_PASSWORD env bootstrap so
 * the panel is never locked out. Returns false if neither is available.
 */
export async function verifyAdminPassword(password: string): Promise<boolean> {
  if (!password) return false;
  const hash = await getStoredHash();
  if (hash) return verifyPasswordHash(password, hash);
  const bootstrap = process.env.MODERATION_PASSWORD;
  return !!bootstrap && password === bootstrap;
}

/** Persist a new password (writes the single credentials row). */
export async function setAdminPassword(password: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("admin_credentials")
    .upsert({ id: 1, password_hash: hashPassword(password), updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}
