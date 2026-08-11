/**
 * Read-only weekly audit of the live Supabase workshop catalog.
 * It writes review artifacts only; it never updates or deletes production data.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  buildWorkshopDataQualityReport,
  workshopDataQualityMarkdown,
  type DataQualityWorkshop,
} from "../src/lib/workshop-data-quality";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
if (!url || !key) throw new Error("Missing public Supabase URL or publishable key.");

const outputFlag = process.argv.indexOf("--output-dir");
const outputDir = resolve(outputFlag >= 0 ? (process.argv[outputFlag + 1] ?? "data-quality-report") : "data-quality-report");
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function loadWorkshops(): Promise<DataQualityWorkshop[]> {
  const workshops: DataQualityWorkshop[] = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("workshops")
      .select("place_id,name,area,governorate,specialty,reviewed_specialty,active,is_automotive,out_of_scope,permanently_closed,phone,phone_intl,lat,lng")
      .order("place_id")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Could not read workshops: ${error.message}`);
    workshops.push(...((data ?? []) as DataQualityWorkshop[]));
    if ((data ?? []).length < pageSize) break;
  }

  return workshops;
}

async function main(): Promise<void> {
  const workshops = await loadWorkshops();
  if (workshops.length === 0) throw new Error("The live workshop catalog returned zero rows.");

  const report = buildWorkshopDataQualityReport(workshops);
  await mkdir(outputDir, { recursive: true });
  await Promise.all([
    writeFile(resolve(outputDir, "workshop-data-quality.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(resolve(outputDir, "workshop-data-quality.md"), workshopDataQualityMarkdown(report), "utf8"),
  ]);

  console.log(`Checked ${report.totalWorkshops} workshops: ${report.summary.errors} errors, ${report.summary.warnings} warnings.`);
  console.log(`Review artifacts: ${outputDir}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
