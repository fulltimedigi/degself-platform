/**
 * Autonomous publisher for @degselfkw — runs on GitHub Actions (hourly cron).
 * Pure Node (global fetch, no deps). State lives in a PRIVATE Supabase bucket
 * "ig-config" (queue.json + token.json), so it never touches the git repo.
 *
 * Self-healing token: refreshes the IG long-lived token when <10 days to expiry.
 *
 * Env: SUPABASE_URL, SUPABASE_KEY  (service/secret key)
 *   node scripts/social/ig-run.cjs            # post everything due now
 *   node scripts/social/ig-run.cjs --dry-run  # show what WOULD post
 */
const V = "v21.0";
const IG = "https://graph.instagram.com";
const SB = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "ig-config";
const DRY = process.argv.includes("--dry-run");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
if (!SB || !KEY) {
  console.error("❌ need SUPABASE_URL + SUPABASE_KEY");
  process.exit(1);
}
const SH = { apikey: KEY, Authorization: "Bearer " + KEY };

// ---- private-bucket JSON helpers ----
async function loadJson(name) {
  const r = await fetch(`${SB}/storage/v1/object/${BUCKET}/${name}`, { headers: SH });
  if (!r.ok) throw new Error(`load ${name}: ${r.status} ${await r.text()}`);
  return r.json();
}
async function saveJson(name, obj) {
  const r = await fetch(`${SB}/storage/v1/object/${BUCKET}/${name}`, {
    method: "POST",
    headers: { ...SH, "Content-Type": "application/json", "x-upsert": "true" },
    body: JSON.stringify(obj, null, 2),
  });
  if (!r.ok) throw new Error(`save ${name}: ${r.status} ${await r.text()}`);
}

// ---- IG API ----
async function igPost(path, params, token) {
  const r = await fetch(`${IG}/${V}/${path}`, {
    method: "POST",
    body: new URLSearchParams({ ...params, access_token: token }),
  });
  const d = await r.json();
  if (d.error) throw new Error(`${d.error.message} (code ${d.error.code})`);
  return d;
}
async function igGet(path, token) {
  const sep = path.includes("?") ? "&" : "?";
  return (await fetch(`${IG}/${V}/${path}${sep}access_token=${token}`)).json();
}

async function publishImage(uid, token, media_url, caption) {
  const c = await igPost(`${uid}/media`, { image_url: media_url, caption }, token);
  for (let i = 0; i < 12; i++) {
    const s = await igGet(`${c.id}?fields=status_code`, token);
    if (s.status_code === "FINISHED") break;
    if (s.status_code === "ERROR") throw new Error("image processing failed");
    await sleep(2000);
  }
  for (let a = 0; ; a++) {
    try {
      return (await igPost(`${uid}/media_publish`, { creation_id: c.id }, token)).id;
    } catch (e) {
      if (a < 4 && /9007|not available/i.test(e.message)) { await sleep(3000); continue; }
      throw e;
    }
  }
}
async function publishReel(uid, token, media_url, caption) {
  const c = await igPost(`${uid}/media`, { media_type: "REELS", video_url: media_url, caption }, token);
  for (let i = 0; i < 36; i++) {
    const s = await igGet(`${c.id}?fields=status_code`, token);
    if (s.status_code === "FINISHED") break;
    if (s.status_code === "ERROR") throw new Error("video processing failed");
    await sleep(5000);
  }
  return (await igPost(`${uid}/media_publish`, { creation_id: c.id }, token)).id;
}

// ---- token self-refresh ----
async function freshToken(cfg) {
  const days = (new Date(cfg.expires_at).getTime() - Date.now()) / 86400000;
  if (days > 10) return cfg;
  console.log(`🔄 token expires in ${days.toFixed(1)}d — refreshing`);
  const d = await igGet(`refresh_access_token?grant_type=ig_refresh_token`, cfg.token);
  if (d.access_token) {
    cfg.token = d.access_token;
    cfg.expires_at = new Date(Date.now() + (d.expires_in || 5184000) * 1000).toISOString();
    if (!DRY) await saveJson("token.json", cfg);
    console.log(`✅ token refreshed, new expiry ${cfg.expires_at}`);
  } else console.error("⚠️ refresh failed:", JSON.stringify(d));
  return cfg;
}

(async () => {
  const cfg = await freshToken(await loadJson("token.json"));
  const queue = await loadJson("queue.json");
  const now = Date.now();
  const due = queue.filter((q) => q.status === "scheduled" && new Date(q.publish_at).getTime() <= now);
  if (!due.length) { console.log("nothing due."); return; }
  let changed = false;
  for (const item of due) {
    if (DRY) { console.log(`🟡 [dry] would post ${item.id} (${item.type})`); continue; }
    try {
      const id = item.type === "reel"
        ? await publishReel(cfg.user_id, cfg.token, item.media_url, item.caption)
        : await publishImage(cfg.user_id, cfg.token, item.media_url, item.caption);
      item.status = "posted";
      item.media_id = id;
      item.posted_at = new Date().toISOString();
      changed = true;
      console.log(`✅ posted ${item.id} → media ${id}`);
    } catch (e) {
      item.status = "error";
      item.error = e.message;
      changed = true;
      console.error(`❌ ${item.id}: ${e.message}`);
    }
  }
  if (changed && !DRY) await saveJson("queue.json", queue);
})().catch((e) => { console.error("❌", e.message); process.exit(1); });
