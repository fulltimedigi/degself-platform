import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Garage self-serve portal: a garage opens its OWN page via a per-garage magic
// link (portal_token) sent to its WhatsApp, confirms its details, and opts in
// with one tap to receive RFQ (price-quote) requests.
//
// Everything here runs with the service-role client (RLS is deny-all). The token
// is the only credential; its blast radius is a single garage row, and every
// write is recorded in workshop_edit_log.

const UNDEFINED_TABLE = "42P01";
const UNDEFINED_COLUMN = "42703";

// Canonical Kuwaiti governorates (must match the DB `area`/`governorate` values
// and the public quote form's AREAS list).
export const PORTAL_AREAS = [
  "العاصمة",
  "حولي",
  "الفروانية",
  "الأحمدي",
  "الجهراء",
  "مبارك الكبير",
] as const;

export interface GaragePortalView {
  placeId: string;
  name: string;
  area: string | null;
  governorate: string | null;
  phoneIntl: string | null;
  phoneLocal: string | null;
  specialty: string | null; // reviewed_specialty (public) or specialty
  specialtyHints: string[];
  openingHours: string | null;
  selfDescription: string | null;
  mainImage: string | null;
  isPartner: boolean;
  rfqEnabled: boolean; // is_partner && rfq_dispatch_enabled
  optInAt: string | null;
  selfEditedAt: string | null;
}

interface WorkshopRow {
  place_id: string;
  name: string;
  area: string | null;
  governorate: string | null;
  phone: string | null;
  phone_intl: string | null;
  specialty: string | null;
  reviewed_specialty: string | null;
  specialty_hints: string[] | null;
  opening_hours: string | null;
  self_description: string | null;
  main_image: string | null;
  is_partner: boolean | null;
  rfq_dispatch_enabled: boolean | null;
  rfq_opt_in_at: string | null;
  self_edited_at: string | null;
}

function toView(row: WorkshopRow): GaragePortalView {
  return {
    placeId: row.place_id,
    name: row.name,
    area: row.area,
    governorate: row.governorate,
    phoneIntl: row.phone_intl,
    phoneLocal: row.phone,
    specialty: row.reviewed_specialty ?? row.specialty,
    specialtyHints: Array.isArray(row.specialty_hints) ? row.specialty_hints : [],
    openingHours: row.opening_hours,
    selfDescription: row.self_description,
    mainImage: row.main_image,
    isPartner: row.is_partner === true,
    rfqEnabled: row.is_partner === true && row.rfq_dispatch_enabled === true,
    optInAt: row.rfq_opt_in_at,
    selfEditedAt: row.self_edited_at,
  };
}

const WORKSHOP_COLS =
  "place_id,name,area,governorate,phone,phone_intl,specialty,reviewed_specialty,specialty_hints,opening_hours,self_description,main_image,is_partner,rfq_dispatch_enabled,rfq_opt_in_at,self_edited_at";

/** A portal token is 40 lowercase hex chars (20 random bytes). */
export function isValidPortalToken(token: string | null | undefined): boolean {
  return typeof token === "string" && /^[a-f0-9]{40}$/.test(token);
}

/**
 * Resolve a portal token to its garage's place_id. Tokens live in the deny-all
 * `garage_portal_tokens` side table (never on the anon-readable workshops table),
 * so the token stays a service-role-only secret.
 */
async function placeIdForToken(
  admin: ReturnType<typeof getSupabaseAdmin>,
  token: string
): Promise<string | null> {
  const { data, error } = await admin
    .from("garage_portal_tokens")
    .select("place_id")
    .eq("token", token)
    .maybeSingle();
  if (error) {
    if (error.code === UNDEFINED_TABLE || error.code === UNDEFINED_COLUMN) return null;
    throw new Error(error.message);
  }
  return data ? (data.place_id as string) : null;
}

export async function resolveGarageByToken(
  token: string
): Promise<GaragePortalView | null> {
  if (!isValidPortalToken(token)) return null;
  const admin = getSupabaseAdmin();

  const placeId = await placeIdForToken(admin, token);
  if (!placeId) return null;

  const { data, error } = await admin
    .from("workshops")
    .select(WORKSHOP_COLS)
    .eq("place_id", placeId)
    .maybeSingle();

  if (error) {
    if (error.code === UNDEFINED_TABLE || error.code === UNDEFINED_COLUMN) return null;
    throw new Error(error.message);
  }
  if (!data) return null;
  return toView(data as unknown as WorkshopRow);
}

async function logEdit(
  admin: ReturnType<typeof getSupabaseAdmin>,
  placeId: string,
  action: "opt_in" | "edit" | "opt_out",
  changes: Record<string, unknown>,
  meta: { ip?: string | null; userAgent?: string | null }
): Promise<void> {
  const { error } = await admin.from("workshop_edit_log").insert({
    place_id: placeId,
    action,
    changes,
    ip: meta.ip ?? null,
    user_agent: meta.userAgent ?? null,
  });
  // Never fail the user action over an audit-log write; just record the miss.
  if (error && error.code !== UNDEFINED_TABLE) {
    console.error("workshop_edit_log insert failed:", error.message);
  }
}

export interface OptInResult {
  ok: boolean;
  alreadyPartner: boolean;
}

/**
 * One-tap opt-in: convert a directory listing into a live RFQ partner.
 *
 * The magic link was delivered to the garage's own WhatsApp, so the tap that
 * reaches this endpoint is treated as verification of that WhatsApp destination
 * — which is exactly what the rfq_dispatch prerequisites require. We therefore
 * set opt-in, phone-verified, and the dispatch kill-switch together so the
 * garage is immediately eligible to receive RFQs. A human can still flip
 * rfq_dispatch_enabled off later without losing the consent record.
 */
export async function optInGarage(
  token: string,
  meta: { ip?: string | null; userAgent?: string | null }
): Promise<OptInResult | null> {
  if (!isValidPortalToken(token)) return null;
  const admin = getSupabaseAdmin();

  const placeId = await placeIdForToken(admin, token);
  if (!placeId) return null;

  const { data: existing, error: readErr } = await admin
    .from("workshops")
    .select("place_id,is_partner,rfq_dispatch_enabled")
    .eq("place_id", placeId)
    .maybeSingle();
  if (readErr) {
    if (readErr.code === UNDEFINED_TABLE || readErr.code === UNDEFINED_COLUMN) return null;
    throw new Error(readErr.message);
  }
  if (!existing) return null;

  const alreadyPartner =
    existing.is_partner === true && existing.rfq_dispatch_enabled === true;

  const now = new Date().toISOString();
  const { error: updErr } = await admin
    .from("workshops")
    .update({
      is_partner: true,
      rfq_opt_in_at: now,
      rfq_opt_in_source: "self_serve",
      rfq_phone_verified_at: now,
      rfq_dispatch_enabled: true,
    })
    .eq("place_id", placeId);
  if (updErr) throw new Error(updErr.message);

  await logEdit(admin, placeId, "opt_in", { via: "portal" }, meta);
  return { ok: true, alreadyPartner };
}

// ── Self-edit ───────────────────────────────────────────────────────────────

export interface GarageEditInput {
  whatsapp?: string | null; // raw phone entered by the garage
  area?: string | null;
  specialty?: string | null; // primary specialty (reviewed_specialty)
  specialtyHints?: string[] | null; // additional specialties
  openingHours?: string | null;
  description?: string | null;
}

export interface NormalizedEdit {
  phone?: string; // local 8-digit
  phone_intl?: string; // +9655XXXXXXX
  area?: string;
  reviewed_specialty?: string;
  specialty_hints?: string[];
  opening_hours?: string;
  self_description?: string;
}

export interface EditValidation {
  patch: NormalizedEdit;
  errors: string[];
}

function clampText(s: string, max: number): string {
  return s.replace(/\s+/g, " ").trim().slice(0, max);
}

/**
 * Normalize a Kuwaiti WhatsApp number to { local, intl } or null if it is not a
 * plausible Kuwaiti mobile (8 digits starting 5/6/9, optionally +965).
 */
export function normalizeKuwaitMobile(
  raw: string
): { local: string; intl: string } | null {
  let d = raw.replace(/[^0-9]/g, "");
  if (d.startsWith("00965")) d = d.slice(5);
  else if (d.startsWith("965") && d.length === 11) d = d.slice(3);
  if (!/^[569][0-9]{7}$/.test(d)) return null;
  return { local: d, intl: `+965${d}` };
}

/**
 * Validate + normalize a garage self-edit into a DB patch. Only fields actually
 * provided (non-empty) are included, so a partial edit only touches what changed.
 */
export function validateGarageEdit(input: GarageEditInput): EditValidation {
  const patch: NormalizedEdit = {};
  const errors: string[] = [];

  if (input.whatsapp != null && input.whatsapp.trim() !== "") {
    const m = normalizeKuwaitMobile(input.whatsapp);
    if (!m) {
      errors.push("رقم الواتساب غير صحيح — لازم رقم كويتي يبدأ بـ 5 أو 6 أو 9.");
    } else {
      patch.phone = m.local;
      patch.phone_intl = m.intl;
    }
  }

  if (input.area != null && input.area.trim() !== "") {
    const a = input.area.trim();
    if (!(PORTAL_AREAS as readonly string[]).includes(a)) {
      errors.push("المنطقة غير معروفة.");
    } else {
      patch.area = a;
    }
  }

  if (input.specialty != null && input.specialty.trim() !== "") {
    patch.reviewed_specialty = clampText(input.specialty, 120);
  }

  if (input.specialtyHints != null) {
    const hints = input.specialtyHints
      .map((h) => clampText(String(h), 60))
      .filter((h) => h.length > 0)
      .slice(0, 12);
    // Only include if the garage actually supplied hints — an empty array from a
    // form with no additions should not wipe existing hints.
    if (hints.length > 0) patch.specialty_hints = Array.from(new Set(hints));
  }

  if (input.openingHours != null && input.openingHours.trim() !== "") {
    patch.opening_hours = clampText(input.openingHours, 200);
  }

  if (input.description != null && input.description.trim() !== "") {
    patch.self_description = clampText(input.description, 400);
  }

  return { patch, errors };
}

// Fields that the `preserve_workshop_profile_overrides` BEFORE UPDATE trigger
// re-applies from workshop_profile_overrides. To make a garage's edit to these
// survive later bulk directory refreshes, we upsert them into the overrides
// table (its exact purpose) before touching workshops.
const OVERRIDE_FIELDS = ["phone", "phone_intl", "area", "reviewed_specialty"] as const;

export interface ApplyEditResult {
  ok: boolean;
  applied: NormalizedEdit;
}

export async function applyGarageSelfEdit(
  token: string,
  patch: NormalizedEdit,
  meta: { ip?: string | null; userAgent?: string | null }
): Promise<ApplyEditResult | null> {
  if (!isValidPortalToken(token)) return null;
  if (Object.keys(patch).length === 0) return { ok: true, applied: {} };

  const admin = getSupabaseAdmin();

  const placeId = await placeIdForToken(admin, token);
  if (!placeId) return null;

  // 1) Lock overridden fields against future bulk refresh via the overrides table.
  const overridePatch: Record<string, unknown> = {};
  for (const f of OVERRIDE_FIELDS) {
    if (patch[f] != null) overridePatch[f] = patch[f];
  }
  if (Object.keys(overridePatch).length > 0) {
    const { error: ovErr } = await admin
      .from("workshop_profile_overrides")
      .upsert(
        { place_id: placeId, ...overridePatch, updated_at: new Date().toISOString() },
        { onConflict: "place_id" }
      );
    if (ovErr && ovErr.code !== UNDEFINED_TABLE) throw new Error(ovErr.message);
  }

  // 2) Write the full patch to workshops. The preserve trigger runs first and
  //    re-applies the override values we just wrote (identical), then the
  //    search_text trigger rebuilds from the new area/specialty_hints. We set
  //    updated_at ourselves since no trigger does.
  const workshopPatch: Record<string, unknown> = {
    self_edited_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (patch.phone != null) workshopPatch.phone = patch.phone;
  if (patch.phone_intl != null) workshopPatch.phone_intl = patch.phone_intl;
  if (patch.area != null) workshopPatch.area = patch.area;
  if (patch.reviewed_specialty != null)
    workshopPatch.reviewed_specialty = patch.reviewed_specialty;
  if (patch.specialty_hints != null) workshopPatch.specialty_hints = patch.specialty_hints;
  if (patch.opening_hours != null) workshopPatch.opening_hours = patch.opening_hours;
  if (patch.self_description != null)
    workshopPatch.self_description = patch.self_description;

  const { error: updErr } = await admin
    .from("workshops")
    .update(workshopPatch)
    .eq("place_id", placeId);
  if (updErr) throw new Error(updErr.message);

  await logEdit(admin, placeId, "edit", patch as Record<string, unknown>, meta);
  return { ok: true, applied: patch };
}

// ── Admin export (outreach batch) ─────────────────────────────────────────────

export interface PortalExportRow {
  name: string;
  area: string;
  whatsapp: string; // +9655XXXXXXX (wa.me-ready)
  portalUrl: string;
  isPartner: boolean;
}

function portalBaseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://degself.com";
}

/** Build the pretty per-garage portal URL: <site>/كراجي/<token>. */
export function portalUrlForToken(token: string): string {
  return `${portalBaseUrl()}/كراجي/${token}`;
}

/** Normalize a stored phone to +9655XXXXXXX if it is a Kuwaiti mobile, else null. */
function toWhatsAppIntl(phone: string | null, phoneIntl: string | null): string | null {
  const m = normalizeKuwaitMobile(phoneIntl ?? phone ?? "");
  return m ? m.intl : null;
}

interface ExportJoinRow {
  token: string;
  workshops: {
    name: string;
    area: string | null;
    phone: string | null;
    phone_intl: string | null;
    is_partner: boolean | null;
  } | null;
}

/**
 * Every WhatsApp-reachable listable garage with its per-garage portal link, for
 * the outreach batch. Service-role only (reads the deny-all token table), so this
 * must be called behind admin auth.
 */
export async function listPortalLinksForExport(): Promise<PortalExportRow[]> {
  const admin = getSupabaseAdmin();
  const rows: PortalExportRow[] = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin
      .from("garage_portal_tokens")
      .select(
        "token, workshops!inner(name,area,phone,phone_intl,is_partner,active,permanently_closed,is_automotive,out_of_scope)"
      )
      .eq("workshops.active", true)
      .eq("workshops.permanently_closed", false)
      .eq("workshops.is_automotive", true)
      .eq("workshops.out_of_scope", false)
      .order("place_id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;

    for (const r of data as unknown as ExportJoinRow[]) {
      const w = r.workshops;
      if (!w) continue;
      const whatsapp = toWhatsAppIntl(w.phone, w.phone_intl);
      if (!whatsapp) continue; // WhatsApp-reachable only
      rows.push({
        name: w.name,
        area: w.area ?? "",
        whatsapp,
        portalUrl: portalUrlForToken(r.token),
        isPartner: w.is_partner === true,
      });
    }
    if (data.length < pageSize) break;
  }

  rows.sort((a, b) => a.area.localeCompare(b.area, "ar") || a.name.localeCompare(b.name, "ar"));
  return rows;
}

/** Serialize export rows to RFC-4180 CSV (with a UTF-8 BOM for Excel/Arabic). */
export function portalExportToCsv(rows: PortalExportRow[]): string {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const header = ["name", "area", "whatsapp", "portal_url", "is_partner"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [esc(r.name), esc(r.area), r.whatsapp, esc(r.portalUrl), r.isPartner ? "yes" : "no"].join(",")
    );
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}
