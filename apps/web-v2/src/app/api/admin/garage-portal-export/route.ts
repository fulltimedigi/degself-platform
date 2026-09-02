import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { listPortalLinksForExport, portalExportToCsv } from "@/lib/garage-portal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin-only. Downloads a CSV of every WhatsApp-reachable listable garage with
// its unique self-serve portal link, for the one-time outreach batch. Tokens
// live in a deny-all table, so this export must stay behind admin auth — the CSV
// itself is a bundle of capability links and should be handled like a secret.
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 401 });
  }

  let csv: string;
  try {
    const rows = await listPortalLinksForExport();
    csv = portalExportToCsv(rows);
  } catch (e) {
    console.error("garage portal export failed:", e);
    return NextResponse.json({ error: "تعذّر التصدير." }, { status: 500 });
  }

  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="garage-portal-links-${day}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
