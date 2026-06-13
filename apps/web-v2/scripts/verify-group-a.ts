/**
 * Final dedup verification for Group (A) dealer/authorized-service candidates,
 * plus individual investigation of Group (D) possible-duplicates. READ ONLY.
 *
 * Run: npx tsx scripts/verify-group-a.ts
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

config({ path: ".env.local" });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);
const __dirname = dirname(fileURLToPath(import.meta.url));

// curated Group (A): authorized dealers / brand service centers we appear to lack
const GROUP_A: string[] = [
  "ChIJLyWukpaazz8RM6eWGav81wc", // Honda Alghanim Main Showroom
  "ChIJ_7jwmZSazz8R1I1BbKNsd6M", // كيا المطوع
  "ChIJDWdE-JCazz8RJuT2chT7y9E", // Honda AlGhanim - motorcycles Rai
  "ChIJA3P1d5eazz8RNFPFVlYEh28", // معرض رينو البابطين
  "ChIJBTLIo0qFzz8RUKIZYGtANck", // Ali Alghanim Certified Used Cars
  "ChIJWxrAZeyazz8R8IS6fGaYBNs", // معرض مصطفى كرم
  "ChIJHVikNL2Ezz8R2xYQ5AR3rt4", // GMC Showroom Sharq
  "ChIJwV7U05Wazz8R17c34MUNDM8", // Jaguar Al Zayani
  "ChIJua4yjcWazz8RxINOlLE-E4g", // هيونداي لقطع الغيار
  "ChIJq-wXDjqFzz8R9F9M9p7Rd8c", // Volvo Studio
  "ChIJf-2SpPKazz8RU8W0kPH4VNE", // معرض أستون مارتن
  "ChIJ_a7nZX6bzz8RTYek--HkAN4", // AL MULLA SELECT used cars
  "ChIJTzcwEMaFzz8RH_kwB1y9yUI", // ACDelco Sharq & GMC Service
  "ChIJg3wGJNyEzz8RdqIjrkC78s4", // مركز خدمة بورشه
  "ChIJ3zjP4byEzz8RWqpvuxo7XYU", // شفروليه الغانم - شرق
  "ChIJ13zOTFWazz8RCUG6ayVLwlM", // Ali Alghanim Omariya Service Station
  "ChIJj7TWML2Ezz8R3ysLfInDsjA", // Al Sayer Spare parts showroom
  "ChIJPVIO8hd3zz8RJd5bbuVHs6I", // Geely Ali Alghanim Salmiya Service Station
  "ChIJKWyppsL3zz8RFOmkC5UadP0", // معرض المطوع والقاضي GAC - الجهراء
  "ChIJ-ZqE4fObzz8RP8WqdDWWrjo", // HongQi Alghanim
  "ChIJfS-CRgD1zz8R4oTV7X2t1Yg", // علي الغانم وأولاده - الجهراء
  "ChIJZzGwKgT3zz8Rq2Uu9fNrbMk", // Geely Ali Alghanim & Sons - الجهراء
  "ChIJR8tj3CGbzz8RftY5lcVHczU", // Ali Alghanim Khaldiya Service Station
  "ChIJq9Ra8OL3zz8R2U_OjttqrNw", // BMW Jahra
  "ChIJDRC5L2-Zzz8Rg0mYWJKw3hY", // علي الغانم 360 مول
];

// Group (D): possible duplicates — DO NOT add; show existing neighbors to decide.
const GROUP_D: string[] = [
  "ChIJ5dE8hsibzz8RKNFaU2Ll3vE", // Mafra Car wash
  "ChIJbxVmZpSazz8RmnNX_dSJFBE", // المطوع و القاضي MUTAWAALKAZI (218)
];

function norm(s: string): string {
  return (s || "").toLowerCase()
    .replace(/[إأآا]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/ـ/g, "")
    .replace(/[^\p{L}\p{N} ]/gu, " ").replace(/\s+/g, " ").trim();
}
function haversine(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000, toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(bLat - aLat), dLng = toR(bLng - aLng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toR(aLat)) * Math.cos(toR(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
// token overlap similarity for name dedup
function nameSim(a: string, b: string): number {
  const A = new Set(norm(a).split(" ").filter((w) => w.length >= 3));
  const B = new Set(norm(b).split(" ").filter((w) => w.length >= 3));
  if (!A.size || !B.size) return 0;
  let inter = 0; for (const w of A) if (B.has(w)) inter++;
  return inter / Math.min(A.size, B.size);
}

type DbRow = { place_id: string; name: string; lat: number | null; lng: number | null; area: string | null; governorate: string | null; phone: string | null };
async function fetchDb(): Promise<DbRow[]> {
  const PAGE = 1000; const all: DbRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("workshops").select("place_id,name,lat,lng,area,governorate,phone")
      .eq("active", true).eq("permanently_closed", false)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const b = (data ?? []) as DbRow[]; all.push(...b);
    if (b.length < PAGE) break;
  }
  return all;
}

async function main() {
  const db = await fetchDb();
  const dbIds = new Set(db.map((r) => r.place_id));
  const coords = db.filter((r) => r.lat != null && r.lng != null);
  const json = JSON.parse(readFileSync(resolve(__dirname, "discover-by-location.json"), "utf8"));
  const byId: Record<string, any> = {};
  for (const r of json.all) byId[r.place_id] = r;

  console.log(`\n${"═".repeat(120)}`);
  console.log(`مجموعة (أ) — تحقق dedup نهائي (${GROUP_A.length} مرشّح)`);
  console.log(`${"═".repeat(120)}\n`);
  console.log("# | المراجعات | الاسم | المنطقة | place_id | أقرب موجود (مسافة / تشابه اسم) | الحكم");

  let i = 0;
  const verified: any[] = [];
  for (const pid of GROUP_A) {
    i++;
    const c = byId[pid];
    if (!c) { console.log(`${i}. ⚠️ ${pid} — غير موجود في تقرير الاكتشاف!`); continue; }
    const idDup = dbIds.has(pid);
    // nearest by coords
    let near: DbRow | null = null, nearD = Infinity;
    for (const d of coords) {
      const dist = haversine(c.lat, c.lng, d.lat!, d.lng!);
      if (dist < nearD) { nearD = dist; near = d; }
    }
    // best name similarity in DB
    let nbest: DbRow | null = null, nbestS = 0;
    for (const d of db) { const s = nameSim(c.name, d.name); if (s > nbestS) { nbestS = s; nbest = d; } }
    const verdict = idDup ? "❌ موجود (place_id)"
      : nearD <= 60 ? "⚠️ قريب جداً — راجع"
      : nbestS >= 0.7 ? "⚠️ تشابه اسم عالي — راجع"
      : "🟢 جديد";
    if (verdict === "🟢 جديد") verified.push({ ...c });
    console.log(`\n${i}. ⭐${c.rating ?? "-"} (${c.reviews}) | ${c.name}`);
    console.log(`   📍 ${c.vicinity ?? "-"}  | place_id=${pid}`);
    console.log(`   🔎 أقرب: «${near?.name ?? "-"}» ${Math.round(nearD)}م · أعلى تشابه اسم: «${nbest?.name ?? "-"}» (${(nbestS * 100).toFixed(0)}%)`);
    console.log(`   ⇒ ${verdict}`);
  }

  console.log(`\n\n${"═".repeat(120)}`);
  console.log(`مجموعة (د) — تحقيق فردي للتكرار المحتمل (لن يُضاف — أنت تقرّر)`);
  console.log(`${"═".repeat(120)}`);
  for (const pid of GROUP_D) {
    const c = byId[pid];
    console.log(`\n▶ المرشّح: ${c.name}  ⭐${c.rating ?? "-"} (${c.reviews})`);
    console.log(`  📍 ${c.vicinity ?? "-"} · place_id=${pid} · types=[${c.types?.join(",")}]`);
    console.log(`  المحلات الموجودة القريبة/المتشابهة في الـDB:`);
    const neigh = db
      .map((d) => ({ d, dist: d.lat != null && d.lng != null ? haversine(c.lat, c.lng, d.lat!, d.lng!) : Infinity, sim: nameSim(c.name, d.name) }))
      .filter((x) => x.dist <= 400 || x.sim >= 0.4)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 8);
    if (!neigh.length) { console.log("    (لا يوجد جار قريب أو اسم متشابه — على الأرجح ليس تكراراً)"); continue; }
    for (const x of neigh) {
      console.log(`    • «${x.d.name}» — ${Math.round(x.dist)}م · تشابه اسم ${(x.sim * 100).toFixed(0)}% · ${x.d.area ?? ""} · ${x.d.phone ?? "بلا هاتف"}`);
      console.log(`        place_id=${x.d.place_id}`);
    }
  }

  console.log(`\n\n✅ من مجموعة (أ): ${verified.length}/${GROUP_A.length} مؤكّد «جديد» وجاهز للإضافة بعد موافقتك.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
