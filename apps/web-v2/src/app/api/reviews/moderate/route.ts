import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createHash, timingSafeEqual } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── auth ──────────────────────────────────────────────────────────────────
// Single shared password in MODERATION_PASSWORD. Fail CLOSED: if it's unset or
// empty, every request is rejected (no accidental open panel in production).
function authorized(req: NextRequest): boolean {
  const expected = process.env.MODERATION_PASSWORD;
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  const got = header.startsWith("Bearer ") ? header.slice(7) : "";
  // Hash both sides to fixed-length buffers so the compare is constant-time and
  // never branches on (or leaks) the password length.
  const a = createHash("sha256").update(got).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

const STATUSES = ["pending", "approved", "rejected"] as const;
type Status = (typeof STATUSES)[number];

interface ModRow {
  id: string;
  place_id: string;
  rating: number;
  author_name: string | null;
  body: string;
  status: Status;
  created_at: string;
  garage_name: string | null;
}

/** GET /api/reviews/moderate?status=pending — list reviews for moderation. */
export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 401 });
  }

  const param = req.nextUrl.searchParams.get("status") ?? "pending";
  const status = (STATUSES as readonly string[]).includes(param) ? (param as Status) : "pending";

  let supabaseAdmin;
  try {
    supabaseAdmin = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: "خدمة التقييمات غير مهيّأة." }, { status: 503 });
  }

  const { data: reviews, error } = await supabaseAdmin
    .from("reviews")
    .select("id,place_id,rating,author_name,body,status,created_at")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: "تعذّر جلب التقييمات." }, { status: 500 });

  // attach garage names in one extra query
  const placeIds = [...new Set((reviews ?? []).map((r) => r.place_id))];
  const names = new Map<string, string>();
  if (placeIds.length) {
    const { data: ws } = await supabaseAdmin
      .from("workshops")
      .select("place_id,name")
      .in("place_id", placeIds);
    for (const w of ws ?? []) names.set(w.place_id, w.name);
  }

  const rows: ModRow[] = (reviews ?? []).map((r) => ({
    ...r,
    garage_name: names.get(r.place_id) ?? null,
  }));

  return NextResponse.json({ reviews: rows });
}

/** PATCH /api/reviews/moderate — body { id, action: 'approve'|'reject' }. */
export async function PATCH(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 401 });
  }

  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  const id = typeof b.id === "string" ? b.id : "";
  const action = b.action;
  if (!id) return NextResponse.json({ error: "المعرّف مفقود." }, { status: 400 });
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "إجراء غير معروف." }, { status: 400 });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: "خدمة التقييمات غير مهيّأة." }, { status: 503 });
  }

  const patch =
    action === "approve"
      ? { status: "approved", approved_at: new Date().toISOString() }
      : { status: "rejected", approved_at: null };

  const { data: updated, error } = await supabaseAdmin
    .from("reviews")
    .update(patch)
    .eq("id", id)
    .select("place_id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "تعذّر تحديث التقييم." }, { status: 500 });
  if (!updated) return NextResponse.json({ error: "التقييم غير موجود." }, { status: 404 });

  // bust the workshop page's ISR cache so the approved/removed review shows
  // immediately instead of waiting up to an hour for revalidation.
  if (updated?.place_id) revalidatePath(`/workshop/${updated.place_id}`);

  return NextResponse.json({ ok: true });
}
