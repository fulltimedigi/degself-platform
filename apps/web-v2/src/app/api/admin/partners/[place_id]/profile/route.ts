import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE_COLUMNS =
  "place_id,name,phone,phone_intl,website,address,area,reviewed_specialty,is_partner,active,permanently_closed";
const OVERRIDE_COLUMNS =
  "place_id,name,phone,phone_intl,website,address,area,reviewed_specialty,hero_image_url,gallery_image_urls,custom_sections,updated_at";

function clean(v: unknown, max: number): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  return v.trim().slice(0, max);
}

function cleanWebsite(v: unknown): string | null | undefined {
  const s = clean(v, 500);
  if (s == null || s === "") return s;
  try {
    const url = new URL(s);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

type CustomSection = {
  title: string;
  items: Array<{ label: string; value: string }>;
};

function cleanCustomSections(v: unknown): CustomSection[] | undefined {
  if (v === undefined) return undefined;
  if (!Array.isArray(v) || v.length > 8) return undefined;

  const sections: CustomSection[] = [];
  for (const rawSection of v) {
    if (!rawSection || typeof rawSection !== "object") return undefined;
    const section = rawSection as Record<string, unknown>;
    const title = clean(section.title, 80);
    if (!title) return undefined;
    if (!Array.isArray(section.items) || section.items.length > 20) return undefined;

    const items: CustomSection["items"] = [];
    for (const rawItem of section.items) {
      if (!rawItem || typeof rawItem !== "object") return undefined;
      const item = rawItem as Record<string, unknown>;
      const label = clean(item.label, 120);
      const value = clean(item.value, 120);
      if (!label || value === undefined || value === null) return undefined;
      if (value === "") continue;
      items.push({ label, value });
    }
    sections.push({ title, items });
  }
  return sections;
}

async function getPartner(admin: ReturnType<typeof getSupabaseAdmin>, placeId: string) {
  return admin.from("workshops").select(BASE_COLUMNS).eq("place_id", placeId).maybeSingle();
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ place_id: string }> }
) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 401 });
  }
  const { place_id } = await params;
  const admin = getSupabaseAdmin();
  const { data: workshop, error: workshopError } = await getPartner(admin, place_id);
  if (workshopError) return NextResponse.json({ error: workshopError.message }, { status: 500 });
  if (!workshop || workshop.is_partner !== true) {
    return NextResponse.json({ error: "الكراج غير موجود في الشبكة." }, { status: 404 });
  }
  const { data: override, error: overrideError } = await admin
    .from("workshop_profile_overrides")
    .select(OVERRIDE_COLUMNS)
    .eq("place_id", place_id)
    .maybeSingle();
  if (overrideError) return NextResponse.json({ error: overrideError.message }, { status: 500 });
  return NextResponse.json({ workshop, override: override ?? null });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ place_id: string }> }
) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 401 });
  }
  const { place_id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: workshop, error: workshopError } = await getPartner(admin, place_id);
  if (workshopError) return NextResponse.json({ error: workshopError.message }, { status: 500 });
  if (!workshop || workshop.is_partner !== true) {
    return NextResponse.json({ error: "التعديل متاح لكراجات الشبكة فقط." }, { status: 404 });
  }

  const values: Record<string, unknown> = { place_id, updated_at: new Date().toISOString() };
  const fields: Array<[string, number]> = [
    ["name", 160],
    ["phone", 40],
    ["phone_intl", 40],
    ["address", 500],
    ["area", 120],
    ["reviewed_specialty", 120],
  ];
  for (const [field, max] of fields) {
    const value = clean(body[field], max);
    if (value !== undefined) values[field] = value;
  }
  if (typeof values.name === "string" && values.name.length < 2) {
    return NextResponse.json({ error: "اسم الكراج يجب ألا يكون فارغًا." }, { status: 400 });
  }
  if (Object.prototype.hasOwnProperty.call(body, "website")) {
    const website = cleanWebsite(body.website);
    if (website === undefined && body.website !== undefined) {
      return NextResponse.json({ error: "رابط الموقع الإلكتروني غير صالح." }, { status: 400 });
    }
    values.website = website;
  }
  if (Object.prototype.hasOwnProperty.call(body, "custom_sections")) {
    const customSections = cleanCustomSections(body.custom_sections);
    if (customSections === undefined) {
      return NextResponse.json({ error: "الخانات الإضافية غير صالحة أو تجاوزت الحدود المسموحة." }, { status: 400 });
    }
    values.custom_sections = customSections;
  }

  if (Object.keys(values).length <= 2) {
    return NextResponse.json({ error: "لا توجد تعديلات للحفظ." }, { status: 400 });
  }

  const { data: savedOverride, error } = await admin
    .from("workshop_profile_overrides")
    .upsert(values, { onConflict: "place_id" })
    .select(OVERRIDE_COLUMNS)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const liveFields = ["name", "phone", "phone_intl", "website", "address", "area", "reviewed_specialty"];
  const workshopUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const field of liveFields) {
    if (Object.prototype.hasOwnProperty.call(values, field)) workshopUpdates[field] = values[field];
  }
  const { data: updatedWorkshop, error: liveError } = await admin
    .from("workshops")
    .update(workshopUpdates)
    .eq("place_id", place_id)
    .select(BASE_COLUMNS)
    .single();
  if (liveError) return NextResponse.json({ error: liveError.message }, { status: 500 });

  return NextResponse.json({ override: savedOverride, workshop: updatedWorkshop });
}
