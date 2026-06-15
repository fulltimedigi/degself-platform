/**
 * Refresh the long-lived Instagram token (Instagram Login API).
 * Long-lived tokens last ~60 days; refreshing (after the token is ≥24h old)
 * resets the clock to another 60 days. Run this on a schedule (e.g. weekly) so
 * the token never expires and posting never silently breaks.
 *
 * Writes the new IG_LONG_TOKEN + IG_TOKEN_EXPIRES back into .env.local.
 * Needs in .env.local: IG_LONG_TOKEN
 * Run:  npx tsx scripts/ig-refresh-token.ts
 */
import { config } from "dotenv";
import fs from "fs";
config({ path: ".env.local" });

const TOK = process.env.IG_LONG_TOKEN;
if (!TOK) {
  console.error("❌ مفيش IG_LONG_TOKEN في .env.local");
  process.exit(1);
}

function writeEnv(updates: Record<string, string>) {
  const p = ".env.local";
  let s = fs.readFileSync(p, "utf-8");
  for (const [k, v] of Object.entries(updates)) {
    const re = new RegExp(`^${k}=.*$`, "m");
    if (re.test(s)) s = s.replace(re, `${k}=${v}`);
    else s += `\n${k}=${v}\n`;
  }
  fs.writeFileSync(p, s);
}

async function main() {
  const r = await fetch(
    `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${TOK}`
  );
  const d = await r.json();
  if (d.error) {
    // common, harmless case: token < 24h old → can't refresh yet
    if (String(d.error.message).includes("24 hours")) {
      console.log("ℹ️ التوكن لسه جديد (<24 ساعة) — مش محتاج تجديد دلوقتي. جرّب بكرة.");
      return;
    }
    throw new Error(`${d.error.message} (code ${d.error.code})`);
  }
  const days = d.expires_in ? Math.round(d.expires_in / 86400) : 60;
  const expires = new Date(Date.now() + (d.expires_in ?? 60 * 86400) * 1000)
    .toISOString()
    .slice(0, 10);
  writeEnv({ IG_LONG_TOKEN: d.access_token, IG_TOKEN_EXPIRES: expires });
  console.log(`✅ اتجدد التوكن — صالح ${days} يوم (لـ ${expires}). اتحفظ في .env.local`);
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
