/**
 * One-time seed of the private "ig-config" Supabase bucket:
 *   - token.json  { token, user_id, expires_at }   (from .env.local)
 *   - queue.json  (content-queue.json, non-posted items flipped to "scheduled")
 *   node scripts/social/seed-config.cjs
 */
const fs = require("fs");
require("dotenv").config({ path: ".env.local" });
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "ig-config";
const H = { apikey: KEY, Authorization: "Bearer " + KEY };

async function ensureBucket() {
  const r = await fetch(`${URL}/storage/v1/bucket`, {
    method: "POST",
    headers: { ...H, "Content-Type": "application/json" },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false }),
  });
  const d = await r.json();
  console.log(r.ok ? "✅ private bucket created" : "• " + (d.message || JSON.stringify(d)));
}
async function put(name, obj) {
  const r = await fetch(`${URL}/storage/v1/object/${BUCKET}/${name}`, {
    method: "POST",
    headers: { ...H, "Content-Type": "application/json", "x-upsert": "true" },
    body: JSON.stringify(obj, null, 2),
  });
  if (!r.ok) throw new Error(`${name}: ${await r.text()}`);
  console.log("⬆️  " + name);
}

(async () => {
  await ensureBucket();
  // token
  const expires =
    process.env.IG_TOKEN_EXPIRES ||
    new Date(Date.now() + 50 * 86400000).toISOString(); // fallback ~50d out
  await put("token.json", {
    token: process.env.IG_LONG_TOKEN,
    user_id: process.env.IG_USER_ID,
    expires_at: expires,
  });
  // queue: flip every non-posted item to scheduled
  const q = JSON.parse(fs.readFileSync("scripts/content-queue.json", "utf8"));
  for (const it of q) if (it.status !== "posted") it.status = "scheduled";
  await put("queue.json", q);
  console.log(`\n✅ seeded. scheduled items: ${q.filter((x) => x.status === "scheduled").length}`);
  console.log("expires_at:", expires);
})().catch((e) => { console.error("❌", e.message); process.exit(1); });
