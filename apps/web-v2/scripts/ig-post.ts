/**
 * Publish a photo to @degselfkw via the Instagram API (Instagram Login flow).
 * Base host is graph.instagram.com (NOT graph.facebook.com) — no FB Page needed.
 * Two steps: create a media container → publish it.
 * The image MUST be a public URL (Instagram fetches it).
 *
 * Needs in .env.local: IG_USER_ID + IG_LONG_TOKEN
 *
 * Validate only (creates container, does NOT post publicly):
 *   npx tsx scripts/ig-post.ts --image="https://degself.com/og-image.jpg" --caption="..."
 * Actually publish:
 *   npx tsx scripts/ig-post.ts --image="..." --caption="..." --publish
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const V = "v21.0";
const HOST = "https://graph.instagram.com";
const UID = process.env.IG_USER_ID;
const TOK = process.env.IG_LONG_TOKEN;
if (!UID || !TOK) {
  console.error("❌ محتاج IG_USER_ID + IG_LONG_TOKEN في .env.local");
  process.exit(1);
}

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`--${name}=`));
  return p ? p.slice(name.length + 3) : undefined;
}
const image = arg("image");
const caption = arg("caption") ?? "";
const doPublish = process.argv.includes("--publish");
if (!image) {
  console.error('❌ محتاج --image="https://..." (رابط صورة عام)');
  process.exit(1);
}

async function post(path: string, params: Record<string, string>) {
  const body = new URLSearchParams({ ...params, access_token: TOK! });
  const r = await fetch(`${HOST}/${V}/${path}`, { method: "POST", body });
  const d = await r.json();
  if (d.error) throw new Error(`${d.error.message} (code ${d.error.code})`);
  return d;
}

async function main() {
  const container = await post(`${UID}/media`, { image_url: image!, caption });
  console.log(`✅ اتعمل media container — id: ${container.id}`);

  if (!doPublish) {
    console.log("\n🟡 فحص فقط — لم يُنشر شيء على الحساب. أضِف --publish للنشر الفعلي.");
    return;
  }

  const published = await post(`${UID}/media_publish`, { creation_id: container.id });
  console.log(`\n✅ تم النشر على @degselfkw — media id: ${published.id}`);
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
