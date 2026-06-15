/**
 * Weekly Instagram insights puller for @degselfkw (Instagram Login API).
 * Pulls per-post reach / saves / shares / interactions and prints a leaderboard
 * sorted by reach, so we can double down on what works and kill what doesn't.
 *
 * Needs in .env.local: IG_USER_ID + IG_LONG_TOKEN
 * Run:  npx tsx scripts/ig-insights.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const HOST = "https://graph.instagram.com";
const UID = process.env.IG_USER_ID;
const TOK = process.env.IG_LONG_TOKEN;
if (!UID || !TOK) {
  console.error("❌ محتاج IG_USER_ID + IG_LONG_TOKEN");
  process.exit(1);
}

async function get(path: string): Promise<any> {
  const sep = path.includes("?") ? "&" : "?";
  const r = await fetch(`${HOST}/${path}${sep}access_token=${TOK}`);
  return r.json();
}

async function mediaInsights(id: string, isReel: boolean): Promise<Record<string, number>> {
  // metric sets differ by media type; try rich → fall back to minimal
  const sets = isReel
    ? ["reach,saved,shares,total_interactions,views", "reach,saved,shares,total_interactions", "reach"]
    : ["reach,saved,shares,total_interactions", "reach,saved,total_interactions", "reach"];
  for (const metric of sets) {
    const d = await get(`${id}/insights?metric=${metric}`);
    if (!d.error && d.data) {
      const out: Record<string, number> = {};
      for (const m of d.data) out[m.name] = m.values?.[0]?.value ?? 0;
      return out;
    }
  }
  return {};
}

async function main() {
  const prof = await get(`${UID}?fields=username,followers_count,media_count`);
  console.log(`\n@${prof.username} — متابعين: ${prof.followers_count} · بوستات: ${prof.media_count}`);

  const m = await get(
    `${UID}/media?fields=id,caption,media_type,media_product_type,timestamp,like_count,comments_count&limit=30`
  );
  const rows: any[] = [];
  for (const p of m.data ?? []) {
    const isReel = p.media_product_type === "REELS";
    const ins = await mediaInsights(p.id, isReel);
    rows.push({
      date: p.timestamp?.slice(0, 10),
      type: isReel ? "REEL" : p.media_type,
      reach: ins.reach ?? 0,
      saved: ins.saved ?? 0,
      shares: ins.shares ?? 0,
      inter: ins.total_interactions ?? 0,
      views: ins.views ?? 0,
      likes: p.like_count ?? 0,
      comments: p.comments_count ?? 0,
      cap: (p.caption ?? "").replace(/\n/g, " ").slice(0, 38),
    });
  }
  rows.sort((a, b) => b.reach - a.reach);

  console.log("\n=== ترتيب البوستات حسب الوصول ===");
  console.log("التاريخ    | النوع    | وصول | حفظ | مشاركة | تفاعل | ❤️ | 💬 | الكابشن");
  for (const r of rows) {
    console.log(
      `${r.date} | ${r.type.padEnd(8)} | ${String(r.reach).padStart(4)} | ${String(r.saved).padStart(3)} | ` +
        `${String(r.shares).padStart(6)} | ${String(r.inter).padStart(5)} | ${String(r.likes).padStart(2)} | ${String(r.comments).padStart(2)} | ${r.cap}`
    );
  }
  const tot = rows.reduce((s, r) => s + r.reach, 0);
  console.log(`\nإجمالي الوصول: ${tot} · متوسط/بوست: ${rows.length ? Math.round(tot / rows.length) : 0}`);
  console.log("👉 الفايز = أعلى (حفظ + مشاركة) — كرّر صيغته.");
}

main().catch((e) => console.error("❌", e.message));
