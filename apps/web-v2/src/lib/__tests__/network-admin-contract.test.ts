import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(relative: string): Promise<string> {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

test("network admin is open-ended with link and manual onboarding", async () => {
  const admin = await source("../../components/AdminPartnersClient.tsx");
  const importer = await source("../../components/PartnerLinkImporter.tsx");
  const customFields = await source("../../components/WorkshopCustomSectionsEditor.tsx");
  const profileEditor = await source("../../components/AdminWorkshopProfileEditor.tsx");
  const api = await source("../../app/api/admin/partners/route.ts");
  const page = await source("../../app/[locale]/admin/partners/page.tsx");

  assert.doesNotMatch(admin, /TARGET\s*=\s*50/);
  assert.doesNotMatch(page, /٥٠|50/);
  assert.match(admin, /PartnerLinkImporter/);
  assert.doesNotMatch(admin, /ابحث في الدليل/);

  assert.match(importer, /كراج جديد — إضافة يدوية/);
  assert.match(importer, /mode:\s*"manual"/);
  assert.match(importer, /اسم الكراج \*/);
  assert.match(importer, /رقم واتساب \*/);
  assert.match(importer, /التخصص الأساسي \*/);
  assert.match(importer, /WorkshopCustomSectionsEditor/);
  assert.match(profileEditor, /WorkshopCustomSectionsEditor/);
  assert.match(customFields, /\+ إضافة خانة/);
  assert.match(customFields, /\+ إضافة عنصر داخل الخانة/);
  assert.match(importer, /صور الكراج/);
  assert.match(importer, /multiple/);
  assert.match(importer, /uploadedPhotos/);
  assert.match(importer, /current\.slice\(uploadedPhotos\)/);
  assert.match(importer, /\/profile/);
  assert.match(importer, /\/media/);
  assert.match(importer, /العنوان — اختياري/);
  assert.match(importer, /الموقع الإلكتروني — اختياري/);
  assert.match(api, /body\.mode === "manual"/);
  assert.match(api, /manual_\$\{randomUUID\(\)\}/);
  assert.match(api, /rfq_dispatch_enabled:\s*false/);
});

test("network workshops render as verified and are visually prioritized", async () => {
  const card = await source("../../components/WorkshopCard.tsx");
  assert.match(card, /is_partner/);
  assert.match(card, /موثق/);
  assert.match(card, /order-first/);
});

test("network remains the routing source of truth", async () => {
  const partners = await source("../partners.ts");
  assert.match(partners, /partners_only:\s*true/);
  assert.match(partners, /partner_priority/);
  assert.match(partners, /fromPartners:\s*true/);
});
