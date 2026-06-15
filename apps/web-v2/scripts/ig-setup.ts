/**
 * One-time Instagram Graph API bootstrap.
 * Reads 3 values from .env.local, then:
 *   1. exchanges the short-lived user token → long-lived token (~60 days)
 *   2. finds the linked Facebook Page + the Instagram Business Account id
 *   3. prints the values to add to .env.local (IG_LONG_TOKEN, IG_BUSINESS_ID)
 *
 * Required in .env.local first:
 *   IG_APP_ID=...            (Meta app → Settings → Basic)
 *   IG_APP_SECRET=...        (same screen, "Show")
 *   IG_USER_TOKEN=...        (short-lived token from Graph API Explorer)
 *
 * Run:  npx tsx scripts/ig-setup.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const V = "v21.0";
const APP_ID = process.env.IG_APP_ID;
const APP_SECRET = process.env.IG_APP_SECRET;
const SHORT = process.env.IG_USER_TOKEN;

if (!APP_ID || !APP_SECRET || !SHORT) {
  console.error("❌ محتاج IG_APP_ID + IG_APP_SECRET + IG_USER_TOKEN في .env.local");
  process.exit(1);
}

async function j(url: string) {
  const r = await fetch(url);
  const d = await r.json();
  if (d.error) throw new Error(`${d.error.message} (code ${d.error.code})`);
  return d;
}

async function main() {
  // 1) short-lived → long-lived
  const ex = await j(
    `https://graph.facebook.com/${V}/oauth/access_token?grant_type=fb_exchange_token` +
      `&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${SHORT}`
  );
  const longToken: string = ex.access_token;
  const days = ex.expires_in ? Math.round(ex.expires_in / 86400) : "≈60";
  console.log(`✅ التوكن طويل الأمد (صالح ${days} يوم).`);

  // 2) pages this user manages
  const pages = await j(
    `https://graph.facebook.com/${V}/me/accounts?fields=id,name,access_token&access_token=${longToken}`
  );
  if (!pages.data?.length) {
    console.error("❌ مفيش صفحات فيسبوك على الحساب ده. اتأكد إنك Admin على صفحة fulltimedigi.");
    process.exit(1);
  }

  // 3) find the page that has a linked IG business account
  let found: { page: string; pageName: string; igId: string } | null = null;
  for (const p of pages.data) {
    const info = await j(
      `https://graph.facebook.com/${V}/${p.id}?fields=instagram_business_account{id,username}&access_token=${longToken}`
    );
    const ig = info.instagram_business_account;
    console.log(`  • صفحة «${p.name}» → ${ig ? `IG @${ig.username} (${ig.id})` : "مفيش إنستغرام مربوط"}`);
    if (ig && !found) found = { page: p.id, pageName: p.name, igId: ig.id };
  }

  if (!found) {
    console.error("\n❌ مفيش حساب إنستغرام Business مربوط بأي صفحة. راجع الربط في Meta Business Suite.");
    process.exit(1);
  }

  console.log("\n══════════ ضيف الأسطر دي في .env.local ══════════");
  console.log(`IG_BUSINESS_ID=${found.igId}`);
  console.log(`IG_LONG_TOKEN=${longToken}`);
  console.log("════════════════════════════════════════════════");
  console.log(`\nالحساب الجاهز للنشر: IG @ ${found.pageName} → ${found.igId}`);
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
