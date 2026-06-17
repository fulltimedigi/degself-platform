import "dotenv/config";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
config({ path: "/tmp/degself-platform/apps/web-v2/.env.local" });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Missing env"); process.exit(1); }
const supabase = createClient(url, key, { auth: { persistSession: false } });

async function run() {
  const { count: total } = await supabase.from("workshops").select("*", { count: "exact", head: true });
  const { count: nonAuto } = await supabase.from("workshops").select("*", { count: "exact", head: true }).eq("is_automotive", false);
  const { count: outScope } = await supabase.from("workshops").select("*", { count: "exact", head: true }).eq("out_of_scope", true);
  const { count: visible } = await supabase.from("workshops").select("*", { count: "exact", head: true }).eq("active", true).eq("is_automotive", true).eq("out_of_scope", false).eq("permanently_closed", false);
  const { count: audited } = await supabase.from("workshops").select("*", { count: "exact", head: true }).not("audit_reviewed_at", "is", null);
  console.log("DB:", JSON.stringify({ total, nonAuto, outScope, visible, audited }, null, 2));
  const { data: bad } = await supabase.from("workshops").select("place_id,name,is_automotive,out_of_scope,active,reviewed_specialty,specialty,permanently_closed").or("name.ilike.%IKEA%,name.ilike.%Lulu%,name.ilike.%LuLu%,name.ilike.%Xcite%,name.ilike.%X-cite%,name.ilike.%Carrefour%,name.ilike.%True Value%,name.ilike.%Canon%,name.ilike.%Bosch%").limit(30);
  console.log("--- Suspicious rows ---");
  for (const r of bad ?? []) console.log(`${r.is_automotive ? "🚗" : "❌"} ${r.active ? "active" : "hidden"} | ${r.name?.slice(0,55)} | rev=${r.reviewed_specialty} | orig=${r.specialty}`);
}
run().catch(e => { console.error(e); process.exit(1); });
