/**
 * Scheduled publisher for @degselfkw. Reads scripts/content-queue.json and
 * publishes any item whose time has come. Run it on a timer (cron / GitHub
 * Actions) every ~30 min; it only posts items that are due and not yet posted.
 *
 * Queue item: { id, status, publish_at (ISO, UTC), type: "image"|"reel",
 *               media_url (public URL), caption }
 *   status: "scheduled" → will post when due · "draft" → ignored ·
 *           "posted"/"error" → skipped (error keeps the message for retry)
 *
 * Image needs a public image_url; reel needs a public .mp4 video_url.
 * Needs in .env.local: IG_USER_ID + IG_LONG_TOKEN
 *
 *   npx tsx scripts/ig-schedule.ts            # post everything due now
 *   npx tsx scripts/ig-schedule.ts --dry-run  # show what WOULD post
 */
import { config } from "dotenv";
import fs from "fs";
config({ path: ".env.local" });

const V = "v21.0";
const HOST = "https://graph.instagram.com";
const UID = process.env.IG_USER_ID;
const TOK = process.env.IG_LONG_TOKEN;
const QUEUE = "scripts/content-queue.json";
const DRY = process.argv.includes("--dry-run");
if (!UID || !TOK) {
  console.error("❌ محتاج IG_USER_ID + IG_LONG_TOKEN");
  process.exit(1);
}

async function post(path: string, params: Record<string, string>) {
  const body = new URLSearchParams({ ...params, access_token: TOK! });
  const r = await fetch(`${HOST}/${V}/${path}`, { method: "POST", body });
  const d = await r.json();
  if (d.error) throw new Error(`${d.error.message} (code ${d.error.code})`);
  return d;
}
async function get(path: string) {
  const sep = path.includes("?") ? "&" : "?";
  const r = await fetch(`${HOST}/${V}/${path}${sep}access_token=${TOK}`);
  return r.json();
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function publishImage(media_url: string, caption: string) {
  const c = await post(`${UID}/media`, { image_url: media_url, caption });
  const out = await post(`${UID}/media_publish`, { creation_id: c.id });
  return out.id;
}

async function publishReel(media_url: string, caption: string) {
  const c = await post(`${UID}/media`, { media_type: "REELS", video_url: media_url, caption });
  // reels process asynchronously — poll until FINISHED (max ~2.5 min)
  for (let i = 0; i < 30; i++) {
    const s = await get(`${c.id}?fields=status_code`);
    if (s.status_code === "FINISHED") break;
    if (s.status_code === "ERROR") throw new Error("فشل معالجة الفيديو");
    await sleep(5000);
  }
  const out = await post(`${UID}/media_publish`, { creation_id: c.id });
  return out.id;
}

async function main() {
  const queue: any[] = JSON.parse(fs.readFileSync(QUEUE, "utf-8"));
  const now = Date.now();
  const due = queue.filter(
    (q) => q.status === "scheduled" && new Date(q.publish_at).getTime() <= now
  );
  if (!due.length) {
    console.log("لا يوجد محتوى مستحق للنشر الآن.");
    return;
  }
  for (const item of due) {
    if (DRY) {
      console.log(`🟡 [dry] هينشر: ${item.id} (${item.type}) — ${item.caption.slice(0, 40)}`);
      continue;
    }
    try {
      const id =
        item.type === "reel"
          ? await publishReel(item.media_url, item.caption)
          : await publishImage(item.media_url, item.caption);
      item.status = "posted";
      item.media_id = id;
      item.posted_at = new Date().toISOString();
      console.log(`✅ اتنشر: ${item.id} → media ${id}`);
    } catch (e: any) {
      item.status = "error";
      item.error = e.message;
      console.error(`❌ فشل: ${item.id} — ${e.message}`);
    }
  }
  if (!DRY) fs.writeFileSync(QUEUE, JSON.stringify(queue, null, 2) + "\n");
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
