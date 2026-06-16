/**
 * Upload public/social/*.jpg (and *.mp4) to a public Supabase Storage bucket
 * and rewrite media_url in scripts/content-queue.json to the public URLs.
 * No repo push / no site deploy needed — Instagram fetches straight from Supabase.
 *
 *   node scripts/social/upload.cjs
 */
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: ".env.local" });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "social";
if (!URL || !KEY) {
  console.error("❌ need NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY");
  process.exit(1);
}
const H = { apikey: KEY, Authorization: "Bearer " + KEY };

async function ensureBucket() {
  const r = await fetch(`${URL}/storage/v1/bucket`, {
    method: "POST",
    headers: { ...H, "Content-Type": "application/json" },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  });
  const d = await r.json();
  if (r.ok) console.log("✅ bucket created:", BUCKET);
  else if (String(d.message || "").includes("exist")) console.log("• bucket exists:", BUCKET);
  else console.log("bucket:", d.message || JSON.stringify(d));
}

const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".mp4": "video/mp4" };

async function upload(file) {
  const buf = fs.readFileSync(path.join("public/social", file));
  const ext = path.extname(file).toLowerCase();
  const r = await fetch(`${URL}/storage/v1/object/${BUCKET}/${file}`, {
    method: "POST",
    headers: { ...H, "Content-Type": MIME[ext] || "application/octet-stream", "x-upsert": "true" },
    body: buf,
  });
  if (!r.ok) {
    const d = await r.text();
    throw new Error(`${file}: ${d}`);
  }
  return `${URL}/storage/v1/object/public/${BUCKET}/${file}`;
}

(async () => {
  await ensureBucket();
  const files = fs.readdirSync("public/social").filter((f) => /\.(jpg|jpeg|png|mp4)$/i.test(f));
  const map = {};
  for (const f of files) {
    map[f] = await upload(f);
    console.log("⬆️ ", map[f]);
  }
  // rewrite queue media_url to the uploaded public URLs (match by basename)
  const QF = "scripts/content-queue.json";
  if (fs.existsSync(QF)) {
    const q = JSON.parse(fs.readFileSync(QF, "utf-8"));
    for (const item of q) {
      const base = path.basename(item.media_url || "");
      if (map[base]) item.media_url = map[base];
    }
    fs.writeFileSync(QF, JSON.stringify(q, null, 2) + "\n");
    console.log("\n✅ queue media_url updated to Supabase URLs");
  }
})().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
