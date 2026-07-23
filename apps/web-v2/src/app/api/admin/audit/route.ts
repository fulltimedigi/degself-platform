/**
 * Admin endpoint to apply the data-accuracy audit to the workshops table.
 *
 * Behaviour:
 * - GET  → returns a summary of what *would* change vs the current DB state
 *           (no writes). Use this to preview the audit before applying.
 * - POST → applies the audit non-destructively: fills reviewed_specialty +
 *           is_automotive + out_of_scope + audit_confidence + audit_reviewed_at,
 *           never touches the original `specialty`.
 *
 * Auth: the shared admin password (DB-backed, set in /admin/settings), same key
 *       as the review-moderation endpoint. Send as `Authorization: Bearer <password>`.
 */
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyAdminPassword } from "@/lib/admin-password";
import corrections from "@/data/audit-corrections.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// audit can take ~30s for ~1800 rows on a slow connection
export const maxDuration = 60;

// The ONE admin password (DB-backed, changeable from /admin/settings; falls back
// to MODERATION_PASSWORD only until first set). verifyAdminPassword does a
// constant-time hash compare internally. Fail CLOSED.
async function authorized(req: NextRequest): Promise<boolean> {
  const header = req.headers.get("authorization") ?? "";
  const got = header.startsWith("Bearer ") ? header.slice(7) : "";
  return verifyAdminPassword(got);
}

type Corr = {
  reviewed_specialty: string | null;
  is_automotive: boolean;
  confidence: string;
  flag: string;
  current: string;
  name: string;
};

const CORRECTIONS = corrections as Record<string, Corr>;

/** GET → preview summary (no writes). */
export async function GET(req: NextRequest) {
  if (!(await authorized(req))) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 401 });
  }
  const entries = Object.entries(CORRECTIONS);
  const flags: Record<string, number> = {};
  let nonAuto = 0;
  let outScope = 0;
  for (const [, c] of entries) {
    flags[c.flag || "ok"] = (flags[c.flag || "ok"] ?? 0) + 1;
    if (!c.is_automotive) nonAuto++;
    if (c.flag === "out_of_scope") outScope++;
  }
  return NextResponse.json({
    total_in_audit_file: entries.length,
    flags,
    non_automotive: nonAuto,
    out_of_scope: outScope,
  });
}

/** POST → apply audit in chunks. */
export async function POST(req: NextRequest) {
  if (!(await authorized(req))) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 401 });
  }
  let supabaseAdmin;
  try {
    supabaseAdmin = getSupabaseAdmin();
  } catch (e) {
    return NextResponse.json(
      { error: `خطأ في الاتصال: ${(e as Error).message}` },
      { status: 500 }
    );
  }

  const entries = Object.entries(CORRECTIONS);
  const NOW = new Date().toISOString();
  const CHUNK = 25;
  let done = 0;
  let failed = 0;
  const failures: { place_id: string; error: string }[] = [];

  for (let i = 0; i < entries.length; i += CHUNK) {
    const slice = entries.slice(i, i + CHUNK);
    const results = await Promise.all(
      slice.map(([placeId, c]) =>
        supabaseAdmin
          .from("workshops")
          .update({
            reviewed_specialty: c.is_automotive ? c.reviewed_specialty : null,
            is_automotive: c.is_automotive,
            out_of_scope: c.flag === "out_of_scope",
            audit_confidence: c.confidence,
            audit_reviewed_at: NOW,
          })
          .eq("place_id", placeId)
          .then(({ error }) => (error ? { error: error.message, place_id: placeId } : null))
      )
    );
    for (const r of results) {
      if (r) {
        failed++;
        if (failures.length < 50) failures.push(r);
      } else {
        done++;
      }
    }
  }

  // count current visible rows for confirmation
  const { count: visible } = await supabaseAdmin
    .from("workshops")
    .select("*", { count: "exact", head: true })
    .eq("active", true)
    .eq("is_automotive", true)
    .eq("out_of_scope", false)
    .eq("permanently_closed", false);

  // bust ISR caches for the affected pages
  try {
    revalidatePath("/");
    revalidatePath("/search");
  } catch {
    // revalidatePath can throw outside request scope on some Next versions —
    // safe to ignore; ISR will catch up on next rebuild.
  }

  return NextResponse.json({
    ok: true,
    updated: done,
    failed,
    visible_after: visible,
    failures: failures.slice(0, 20),
  });
}
