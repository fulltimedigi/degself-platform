import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getWorkshop } from "@/lib/workshops";

// Node runtime so we can read the bundled font via fs (traced into the build by
// the literal join(process.cwd(), …) path).
export const runtime = "nodejs";
export const revalidate = 86400;

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "دق سلف — دليل كراجات الكويت";

const YELLOW = "#FFD60A";
const BLACK = "#0A0A0A";

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s;
}

export default async function OgImage({
  params,
}: {
  params: Promise<{ place_id: string }>;
}) {
  const { place_id } = await params;
  // Static (non-variable) Cairo subsets — Satori/next-og can't render variable
  // fonts. Arabic + Latin so mixed names/digits ("Google", "degself.com") shape.
  const [w, cairoAr, cairoLat] = await Promise.all([
    getWorkshop(place_id),
    readFile(join(process.cwd(), "assets/Cairo-arabic-700.ttf")),
    readFile(join(process.cwd(), "assets/Cairo-latin-700.ttf")),
  ]);

  const name = truncate(w?.name ?? "دق سلف", 42);
  const specialty = w?.reviewed_specialty ?? w?.specialty ?? "";
  const area = w?.area ?? "";
  // Arabic comma keeps the line a single RTL run (a neutral "·" breaks bidi).
  const metaLine = [specialty, area].filter(Boolean).join("، ");
  const rating = w?.google_rating ?? null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "flex-end",
          textAlign: "right",
          direction: "rtl",
          background: BLACK,
          padding: "70px 80px",
          fontFamily: "Cairo",
        }}
      >
        {/* Top: brand + yellow accent (bar at the RTL start = right) */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 16, height: 56, background: YELLOW, borderRadius: 8 }} />
          <div style={{ display: "flex", fontSize: 46, fontWeight: 700, color: YELLOW }}>
            دق سلف
          </div>
        </div>

        {/* Middle: workshop name + specialty/area + rating */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 24 }}>
          <div
            style={{
              display: "flex",
              fontSize: 76,
              fontWeight: 700,
              color: "#FFFFFF",
              lineHeight: 1.15,
            }}
          >
            {name}
          </div>
          {/* Single plain Arabic strings render correctly under direction:rtl;
              flex-child ordering and neutral punctuation (·) do NOT, so avoid them. */}
          {metaLine && (
            <div style={{ display: "flex", fontSize: 40, color: "#D4D4D4" }}>{metaLine}</div>
          )}
          {rating != null && (
            <div
              style={{ display: "flex", alignSelf: "flex-end" }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 36,
                  fontWeight: 700,
                  color: BLACK,
                  background: YELLOW,
                  borderRadius: 14,
                  padding: "8px 26px",
                }}
              >
                {`التقييم ${rating.toFixed(1)} من 5`}
              </div>
            </div>
          )}
        </div>

        {/* Bottom: domain */}
        <div style={{ display: "flex", fontSize: 32, color: "#8A8A8A" }}>degself.com</div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Cairo", data: cairoAr, style: "normal", weight: 700 },
        { name: "Cairo", data: cairoLat, style: "normal", weight: 700 },
      ],
    }
  );
}
