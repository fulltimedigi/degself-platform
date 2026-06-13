/**
 * Build REVIEW lists for the destructive decisions (no writes, no deletes):
 *   1. permanently/temporarily CLOSED (from enrich-full.json)
 *   2. NON_CAR rows still active (is_automotive=false & active=true)
 *   3. likely internal duplicates: exact normalized-name groups + coord pairs <30m
 * Writes scripts/review-issues.json + prints a digest. You decide what to remove.
 *
 * Run: npx tsx scripts/review-issues.ts
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

config({ path: ".env.local" });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
const __dirname = dirname(fileURLToPath(import.meta.url));

function norm(s: string): string {
  return (s || "").toLowerCase().replace(/[إأآا]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/ـ/g, "").replace(/[^\p{L}\p{N} ]/gu, " ").replace(/\s+/g, " ").trim();
}
function hav(a: number, b: number, c: number, d: number): number {
  const R = 6371000, t = (x: number) => x * Math.PI / 180;
  const dLat = t(c - a), dLng = t(d - b);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

async function main() {
  const all: any[] = [];
  for (let f = 0; ; f += 1000) {
    const { data, error } = await supabase.from("workshops")
      .select("place_id,name,area,governorate,specialty,reviewed_specialty,is_automotive,active,permanently_closed,google_reviews_count,phone,lat,lng")
      .range(f, f + 999);
    if (error) throw new Error(error.message);
    all.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
  }
  const act = all.filter((r) => r.active && !r.permanently_closed);

  // 1. closed (from enrichment)
  const enrich = JSON.parse(readFileSync(resolve(__dirname, "enrich-full.json"), "utf8")) as Record<string, any>;
  const byId: Record<string, any> = {};
  for (const r of all) byId[r.place_id] = r;
  const closedPerm: any[] = [], closedTemp: any[] = [];
  for (const [pid, e] of Object.entries(enrich)) {
    if (e.error) continue;
    const row = byId[pid];
    if (e.business_status === "CLOSED_PERMANENTLY") closedPerm.push({ pid, name: e.name, area: row?.area, reviews: row?.google_reviews_count });
    else if (e.business_status === "CLOSED_TEMPORARILY") closedTemp.push({ pid, name: e.name, area: row?.area, reviews: row?.google_reviews_count });
  }

  // 2. NON_CAR still active
  const nonCar = act.filter((r) => r.is_automotive === false)
    .map((r) => ({ pid: r.place_id, name: r.name, area: r.area, specialty: r.specialty, reviews: r.google_reviews_count }))
    .sort((a, b) => (b.reviews ?? 0) - (a.reviews ?? 0));

  // 3a. exact normalized-name duplicate groups
  const nameGroups = new Map<string, any[]>();
  for (const r of act) { const n = norm(r.name); if (n.length >= 6) (nameGroups.get(n) ?? nameGroups.set(n, []).get(n)!).push(r); }
  const nameDups = [...nameGroups.values()].filter((g) => g.length > 1)
    .map((g) => g.map((r) => ({ pid: r.place_id, name: r.name, area: r.area, reviews: r.google_reviews_count, phone: r.phone })));

  // 3b. coord pairs <30m WITH high name similarity (more likely true dups, not neighbors)
  const coords = act.filter((r) => r.lat != null && r.lng != null);
  const grid = new Map<string, any[]>();
  for (const r of coords) { const k = `${Math.round(r.lat * 900)}_${Math.round(r.lng * 900)}`; (grid.get(k) ?? grid.set(k, []).get(k)!).push(r); }
  const seen = new Set<string>(); const coordDups: any[] = [];
  function tokSim(a: string, b: string) { const A = new Set(norm(a).split(" ").filter((w) => w.length >= 3)), B = new Set(norm(b).split(" ").filter((w) => w.length >= 3)); if (!A.size || !B.size) return 0; let i = 0; for (const w of A) if (B.has(w)) i++; return i / Math.min(A.size, B.size); }
  for (const r of coords) {
    const gx = Math.round(r.lat * 900), gy = Math.round(r.lng * 900);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const o of grid.get(`${gx + dx}_${gy + dy}`) ?? []) {
      if (o === r) continue;
      const id = [r.place_id, o.place_id].sort().join("|"); if (seen.has(id)) continue;
      const dist = hav(r.lat, r.lng, o.lat, o.lng);
      const sim = tokSim(r.name, o.name);
      if (dist < 30 && sim >= 0.5) { seen.add(id); coordDups.push({ dist: Math.round(dist), sim: +(sim * 100).toFixed(0), a: { pid: r.place_id, name: r.name, area: r.area, reviews: r.google_reviews_count }, b: { pid: o.place_id, name: o.name, area: o.area, reviews: o.google_reviews_count } }); }
    }
  }
  coordDups.sort((a, b) => b.sim - a.sim || a.dist - b.dist);

  writeFileSync(resolve(__dirname, "review-issues.json"), JSON.stringify({ closedPerm, closedTemp, nonCar, nameDups, coordDups }, null, 2), "utf8");

  console.log(`\n${"═".repeat(80)}\nتقارير المراجعة (بدون حذف — أنت تقرّر)\n${"═".repeat(80)}`);
  console.log(`\n🔴 مغلق دائماً (جوجل): ${closedPerm.length}`);
  for (const c of closedPerm) console.log(`   • «${c.name}» · ${c.area} · ${c.reviews ?? 0} مراجعة · ${c.pid}`);
  console.log(`\n🟠 مغلق مؤقتاً (جوجل): ${closedTemp.length}`);
  for (const c of closedTemp) console.log(`   • «${c.name}» · ${c.area} · ${c.reviews ?? 0} مراجعة`);

  console.log(`\n🚫 NON_CAR نشطين (is_automotive=false): ${nonCar.length}  — أعلى 15 بالمراجعات:`);
  for (const r of nonCar.slice(0, 15)) console.log(`   • «${r.name}» · ${r.specialty} · ${r.area} · ${r.reviews ?? 0} مراجعة`);

  console.log(`\n🔁 مجموعات أسماء متطابقة: ${nameDups.length}`);
  for (const g of nameDups) { console.log(`   ── «${g[0].name}» ×${g.length}:`); for (const m of g) console.log(`        ${m.area} · ${m.reviews ?? 0} مراجعة · ${m.phone ?? "بلا هاتف"} · ${m.pid}`); }

  console.log(`\n🔁 أزواج <30م + تشابه اسم ≥50% (دوبليكيت محتمل، مش جيران): ${coordDups.length}`);
  for (const p of coordDups.slice(0, 25)) console.log(`   • ${p.dist}م/${p.sim}% — «${p.a.name}» (${p.a.reviews ?? 0}) ⟷ «${p.b.name}» (${p.b.reviews ?? 0})`);

  console.log(`\nfull: scripts/review-issues.json`);
}
main().catch((e) => { console.error(e); process.exit(1); });
